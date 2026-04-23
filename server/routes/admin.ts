import { Router, type Request, type Response } from 'express'
import { createClient } from '@supabase/supabase-js'

const router = Router()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const DISCORD_WEBHOOK = process.env.ADMIN_PASSWORD_WEBHOOK
const CRON_SECRET = process.env.CRON_SECRET

/**
 * GET / POST /api/admin/rotate-password
 *
 * Called by Vercel Cron once a day. Generates a fresh 16-char password,
 * stores its bcrypt hash in `admin_passwords`, then posts the plaintext to
 * the Discord webhook. The plaintext is NEVER logged or returned in the
 * response (response body just confirms success).
 *
 * Authorization: must include header `x-cron-secret: ${CRON_SECRET}`. We
 * also accept `?secret=` for the Vercel cron config which doesn't allow
 * custom headers.
 *
 * vercel.json crons array should look like:
 *   { "crons": [{ "path": "/api/admin/rotate-password?secret=…", "schedule": "0 7 * * *" }] }
 */
router.all('/rotate-password', async (req: Request, res: Response) => {
  const provided =
    (req.headers['x-cron-secret'] as string | undefined) ||
    (req.query.secret as string | undefined)
  if (!CRON_SECRET || provided !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return res.status(500).json({ error: 'Supabase service-role key not configured' })
  }

  const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    // RPC returns the plaintext password (only available here, never logged).
    const { data, error } = await supa.rpc('rotate_admin_password')
    if (error) throw error
    const password = data as unknown as string
    if (!password) throw new Error('Password rotation returned empty result')

    // Send to Discord webhook (if configured)
    if (DISCORD_WEBHOOK) {
      const today = new Date().toISOString().slice(0, 10)
      const body = {
        username: 'Anime Wiki Bot',
        avatar_url: 'https://animewiki.vercel.app/favicon.svg',
        embeds: [
          {
            title: '🔐 Mật khẩu admin hôm nay',
            description: `\`\`\`\n${password}\n\`\`\``,
            color: 0x7c3aed,
            fields: [
              { name: 'Ngày', value: today, inline: true },
              { name: 'TTL', value: '24 giờ', inline: true },
              { name: 'Sử dụng', value: 'Nhập tại `/admin` sau khi đăng nhập tài khoản admin/owner.' },
            ],
            footer: { text: 'Tự động xoá sau 7 ngày · Anime Wiki' },
            timestamp: new Date().toISOString(),
          },
        ],
      }
      await fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }).catch((e) => {
        console.warn('Discord webhook failed (password still rotated)', e)
      })
    }

    return res.json({
      ok: true,
      rotated_at: new Date().toISOString(),
      webhook_sent: Boolean(DISCORD_WEBHOOK),
    })
  } catch (err: any) {
    console.error('rotate-password failed', err)
    return res.status(500).json({ error: err?.message || 'unknown' })
  }
})

export default router
