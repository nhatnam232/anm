import { useEffect, useState } from 'react'
import { Loader2, Lock, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { useLangContext } from '@/providers/LangProvider'

const TOKEN_STORAGE_KEY = 'anm-admin-gate-ok'

type Props = {
  children: React.ReactNode
}

/**
 * 2-factor gate for the Admin Dashboard:
 *   1. Must be signed in with mod/admin/owner badge (enforced in DB anyway).
 *   2. Must enter today's daily-rotated admin password.
 *
 * The plaintext password is sent ONLY to the Discord webhook configured in
 * env. Once the user enters it correctly, we cache a tiny "ok" flag in
 * sessionStorage that auto-expires when the tab is closed.
 *
 * This is defense-in-depth — losing your account password should NOT be
 * enough to take admin actions.
 */
export default function AdminPasswordGate({ children }: Props) {
  const { user, profile } = useAuth()
  const { lang } = useLangContext()
  const [unlocked, setUnlocked] = useState(false)
  const [candidate, setCandidate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Restore prior session unlock if the cached marker is from today.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY)
      if (!raw) return
      const cached = JSON.parse(raw) as { date: string; uid: string }
      const today = new Date().toISOString().slice(0, 10)
      if (cached.date === today && cached.uid === user?.id) {
        setUnlocked(true)
      }
    } catch {}
  }, [user?.id])

  if (!user) {
    return (
      <div className="container mx-auto max-w-md px-4 py-20 text-center">
        <Lock className="mx-auto h-10 w-10 text-text-muted" />
        <h2 className="mt-3 text-xl font-semibold text-text">
          {lang === 'vi' ? 'Cần đăng nhập' : 'Sign-in required'}
        </h2>
      </div>
    )
  }

  // Hide rather than soft-deny when the viewer isn't even mod (defense in depth):
  if (!profile?.badges?.some((b) => b === 'mod' || b === 'admin' || b === 'owner')) {
    return (
      <div className="container mx-auto max-w-md px-4 py-20 text-center">
        <Lock className="mx-auto h-10 w-10 text-red-400" />
        <h2 className="mt-3 text-xl font-semibold text-text">
          {lang === 'vi' ? 'Không có quyền truy cập' : 'Access denied'}
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          {lang === 'vi'
            ? 'Trang này chỉ dành cho mod/admin/owner.'
            : 'This page is restricted to mods/admins/owners.'}
        </p>
      </div>
    )
  }

  if (unlocked) return <>{children}</>

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setError(null)
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('verify_admin_password', { candidate })
      if (error) throw error
      if (data === true) {
        const today = new Date().toISOString().slice(0, 10)
        try {
          sessionStorage.setItem(
            TOKEN_STORAGE_KEY,
            JSON.stringify({ date: today, uid: user.id }),
          )
        } catch {}
        setUnlocked(true)
      } else {
        setError(lang === 'vi' ? 'Mật khẩu không đúng. Hãy kiểm tra Discord webhook.' : 'Wrong password. Check the Discord webhook.')
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed')
    } finally {
      setLoading(false)
      setCandidate('')
    }
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-16">
      <div className="rounded-3xl border border-border bg-card p-8 shadow-2xl">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-text">
              {lang === 'vi' ? 'Cổng quản trị' : 'Admin Gate'}
            </h1>
            <p className="text-xs text-text-muted">
              {lang === 'vi' ? 'Yêu cầu mật khẩu hôm nay (gửi qua Discord)' : 'Today\'s password required (sent via Discord)'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
            <input
              autoFocus
              type="password"
              value={candidate}
              onChange={(e) => setCandidate(e.target.value)}
              placeholder={lang === 'vi' ? 'Mật khẩu admin hôm nay' : 'Today\'s admin password'}
              required
              minLength={8}
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm font-mono tracking-widest text-text focus:border-primary focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || candidate.length < 8}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 font-medium text-white transition hover:bg-primary-hover disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {lang === 'vi' ? 'Mở khoá' : 'Unlock'}
          </button>
        </form>

        <p className="mt-4 text-[11px] leading-relaxed text-text-muted">
          {lang === 'vi'
            ? 'Mật khẩu reset mỗi ngày lúc 00:00 UTC. Mỗi lần thử đều được ghi log audit_logs. Phiên unlock chỉ tồn tại trong tab hiện tại.'
            : 'Password rotates daily at 00:00 UTC. Every attempt is recorded in audit_logs. The unlock state lives only in this tab.'}
        </p>
      </div>
    </div>
  )
}
