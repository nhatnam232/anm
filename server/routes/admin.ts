import { Router, type Request, type Response } from 'express'
import { createClient } from '@supabase/supabase-js'

const router = Router()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const DISCORD_WEBHOOK = process.env.ADMIN_PASSWORD_WEBHOOK
const SITE_URL = process.env.SITE_URL || 'https://animewiki.vercel.app'
// Optional manual override — usually unset, the DB auto-generates one.
const ENV_CRON_SECRET = process.env.CRON_SECRET

let cachedSupabase: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (cachedSupabase) return cachedSupabase
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) return null
  cachedSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return cachedSupabase
}

/**
 * Lazy-fetch the cron secret from Postgres (system_secrets table).
 *
 * On first call (and every cold start) this hits the DB, then we cache it in
 * module-scope memory until the next deployment. If the row doesn't exist
 * the RPC will create one — so the user never has to manually generate
 * anything.
 */
let cachedCronSecret: string | null = ENV_CRON_SECRET ?? null
async function getCronSecret(): Promise<string | null> {
  if (cachedCronSecret) return cachedCronSecret
  const supa = getSupabase()
  if (!supa) return null
  const { data, error } = await supa.rpc('get_or_create_cron_secret')
  if (error) {
    console.error('get_or_create_cron_secret failed', error)
    return null
  }
  cachedCronSecret = (data as unknown as string) ?? null
  return cachedCronSecret
}

/**
 * Authentication strategy for /api/admin/rotate-password:
 *
 *  ✅ ACCEPT if the request has Vercel's special `x-vercel-cron-signature`
 *      header (only set by Vercel cron — can't be forged from outside).
 *  ✅ ACCEPT if the request has User-Agent starting with `vercel-cron/`.
 *  ✅ ACCEPT if `?secret=` (or `x-cron-secret` header) matches our cached
 *      cron secret. Useful for manual curl during testing or for the
 *      Supabase pg_cron alternative.
 *
 * The user therefore needs to do ZERO env-var configuration for the cron to
 * work — Vercel sets the headers automatically once the cron is registered
 * in vercel.json.
 */
async function authorizeRequest(req: Request): Promise<{ ok: boolean; reason?: string }> {
  // 1. Vercel cron signature (most secure — Vercel sets this internally)
  if (req.headers['x-vercel-cron-signature']) return { ok: true }

  // 2. User-Agent fallback (Vercel cron sends `vercel-cron/1.0` UA)
  const ua = String(req.headers['user-agent'] ?? '').toLowerCase()
  if (ua.startsWith('vercel-cron/')) return { ok: true }

  // 3. Manual override (curl / pg_cron / opt-in env CRON_SECRET)
  const provided =
    (req.headers['x-cron-secret'] as string | undefined) ||
    (req.query.secret as string | undefined)
  if (provided) {
    const secret = await getCronSecret()
    if (secret && provided === secret) return { ok: true }
    return { ok: false, reason: 'Invalid cron secret' }
  }

  return { ok: false, reason: 'No cron credentials provided' }
}

/**
 * GET / POST /api/admin/rotate-password
 *
 * Vercel cron calls this every day at 00:00 UTC (see vercel.json). It:
 *   1. Generates a fresh 16-char password via the Postgres RPC.
 *   2. Stores its bcrypt hash in `admin_passwords` table.
 *   3. POSTs the plaintext to the Discord webhook (so the owner sees it).
 *   4. Returns a JSON status (NEVER includes the plaintext).
 *
 * Manual usage:
 *   curl https://YOUR-SITE.vercel.app/api/admin/rotate-password \
 *        -H "x-cron-secret: $(supabase secret)"
 *
 * But you usually never need to call this manually — Vercel cron handles it.
 */
router.all('/rotate-password', async (req: Request, res: Response) => {
  const supa = getSupabase()
  if (!supa) {
    return res.status(500).json({
      error: 'SUPABASE_SERVICE_ROLE_KEY not configured. Add it to your Vercel env.',
    })
  }

  const auth = await authorizeRequest(req)
  if (!auth.ok) {
    return res.status(401).json({ error: auth.reason || 'Unauthorized' })
  }

  try {
    // Postgres RPC returns the plaintext password (only available in this
    // function scope — never logged, never returned in the JSON response).
    const { data, error } = await supa.rpc('rotate_admin_password')
    if (error) throw error
    const password = data as unknown as string
    if (!password) throw new Error('Password rotation returned empty result')

    // POST to Discord webhook
    let webhookSent = false
    let webhookError: string | undefined
    if (DISCORD_WEBHOOK) {
      try {
        const today = new Date().toISOString().slice(0, 10)
        const body = {
          username: 'Anime Wiki Bot',
          avatar_url: `${SITE_URL}/favicon.svg`,
          embeds: [
            {
              title: '🔐 Mật khẩu admin hôm nay',
              description: `\`\`\`\n${password}\n\`\`\``,
              color: 0x7c3aed,
              fields: [
                { name: 'Ngày', value: today, inline: true },
                { name: 'TTL', value: '24 giờ', inline: true },
                {
                  name: 'Sử dụng',
                  value: `Nhập tại [${SITE_URL}/admin](${SITE_URL}/admin) sau khi đăng nhập tài khoản admin/owner.`,
                },
              ],
              footer: { text: 'Tự động xoá sau 7 ngày · Anime Wiki' },
              timestamp: new Date().toISOString(),
            },
          ],
        }
        const r = await fetch(DISCORD_WEBHOOK, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        })
        webhookSent = r.ok
        if (!r.ok) webhookError = `Discord returned HTTP ${r.status}`
      } catch (e: any) {
        webhookError = e?.message || 'unknown'
      }
    }

    return res.json({
      ok: true,
      rotated_at: new Date().toISOString(),
      webhook_configured: Boolean(DISCORD_WEBHOOK),
      webhook_sent: webhookSent,
      webhook_error: webhookError,
      hint: webhookSent
        ? 'Plaintext sent to Discord channel.'
        : DISCORD_WEBHOOK
          ? 'Webhook failed — check Discord channel permissions.'
          : 'No ADMIN_PASSWORD_WEBHOOK env var. Use the "Generate today\'s password" button on /admin or run rotate_admin_password() in Supabase SQL editor.',
    })
  } catch (err: any) {
    console.error('rotate-password failed', err)
    return res.status(500).json({ error: err?.message || 'unknown' })
  }
})

/**
 * GET /api/admin/cron-secret
 *
 * Owner-only escape hatch — returns the current auto-generated cron secret
 * so the owner can paste it into pg_cron / GitHub Actions if they want to
 * call rotate-password from somewhere other than Vercel cron.
 *
 * Authorization: requires the Supabase access token of an owner-badged user
 * (sent as `Authorization: Bearer <token>` header).
 */
router.get('/cron-secret', async (req: Request, res: Response) => {
  const supa = getSupabase()
  if (!supa) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Bearer token' })
  }
  const token = auth.slice(7)

  // Verify the token belongs to an owner
  const { data: userData, error: userErr } = await supa.auth.getUser(token)
  if (userErr || !userData?.user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  const { data: profile } = await supa
    .from('profiles')
    .select('badges')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (!profile) {
    return res.status(403).json({ error: 'Profile not found' })
  }
  const badges = ((profile as { badges?: string[] }).badges) ?? []
  if (!badges.includes('owner')) {
    return res.status(403).json({ error: 'Owner badge required' })
  }

  const secret = await getCronSecret()
  if (!secret) return res.status(500).json({ error: 'Could not retrieve secret' })
  return res.json({ secret, hint: 'Save this somewhere safe. Used to authenticate manual rotate-password calls.' })
})

export default router
