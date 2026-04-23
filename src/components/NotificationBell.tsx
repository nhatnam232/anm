import { useEffect, useRef, useState } from 'react'
import { Bell, BellOff, CheckCheck, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useNotifications } from '@/providers/NotificationsProvider'
import { useLangContext } from '@/providers/LangProvider'

/**
 * Bell icon in the navbar showing unread notification count + dropdown panel.
 *
 * Designed to gracefully degrade: when the user is signed-out OR Supabase isn't
 * configured the provider returns an empty array — we just render a quiet bell
 * with no badge.
 */
export default function NotificationBell() {
  const { items, unreadCount, markAllRead, markRead, dismiss } = useNotifications()
  const { lang, t } = useLangContext()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [])

  const hasUnread = unreadCount > 0
  const formatWhen = (iso: string) => {
    const d = new Date(iso)
    const diff = (Date.now() - d.getTime()) / 1000
    if (diff < 60) return t.justNow
    if (diff < 3600) return t.minutesAgo(Math.floor(diff / 60))
    if (diff < 86400) return t.hoursAgo(Math.floor(diff / 3600))
    if (diff < 7 * 86400) return t.daysAgo(Math.floor(diff / 86400))
    return d.toLocaleDateString()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t.notifications}
        aria-label={t.notifications}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/70 text-text-muted transition-all hover:border-primary hover:text-text"
      >
        <Bell className="h-4 w-4" />
        {hasUnread && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-md">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-text">
              <Bell className="h-4 w-4 text-primary" />
              {t.notifications}
              {hasUnread && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {unreadCount}
                </span>
              )}
            </h3>
            {hasUnread && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-primary"
                title={t.markAllRead}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.markAllRead}</span>
              </button>
            )}
          </header>

          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <BellOff className="h-10 w-10 text-text-muted/40" />
                <p className="text-sm font-medium text-text">{t.noNotifications}</p>
                <p className="text-xs text-text-muted">{t.notificationHint}</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => {
                  const isUnread = !n.read_at
                  const headline =
                    n.body ??
                    (n.kind === 'new_episode' && n.anime_title && n.episode != null
                      ? t.notificationNewEpisode(n.anime_title, n.episode)
                      : t.notifications)
                  const linkTo = n.link ?? (n.anime_id ? `/anime/${n.anime_id}` : '#')
                  return (
                    <li
                      key={n.id}
                      className={`group relative flex gap-3 px-4 py-3 transition-colors hover:bg-surface ${
                        isUnread ? 'bg-primary/[0.06]' : ''
                      }`}
                    >
                      {/* Unread dot */}
                      {isUnread && (
                        <span
                          className="absolute left-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_6px_rgba(124,58,237,0.6)]"
                          aria-label="Unread"
                        />
                      )}

                      {n.anime_cover ? (
                        <img
                          src={n.anime_cover}
                          alt=""
                          className="h-12 w-9 flex-shrink-0 rounded-md object-cover"
                          loading="lazy"
                          onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                        />
                      ) : (
                        <div className="flex h-12 w-9 flex-shrink-0 items-center justify-center rounded-md bg-surface text-text-muted">
                          <Bell className="h-4 w-4" />
                        </div>
                      )}

                      <Link
                        to={linkTo}
                        onClick={() => {
                          if (isUnread) void markRead(n.id)
                          setOpen(false)
                        }}
                        className="min-w-0 flex-1"
                      >
                        <p className="line-clamp-2 text-sm text-text">{headline}</p>
                        <p className="mt-0.5 text-[10px] text-text-muted">
                          {formatWhen(n.created_at)}
                        </p>
                      </Link>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          void dismiss(n.id)
                        }}
                        className="self-start rounded-full p-1 text-text-muted opacity-0 transition-all hover:bg-red-500/15 hover:text-red-400 group-hover:opacity-100"
                        aria-label={lang === 'vi' ? 'Bỏ qua' : 'Dismiss'}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <footer className="border-t border-border px-4 py-2 text-center">
            <p className="text-[10px] text-text-muted">{t.notificationHint}</p>
          </footer>
        </div>
      )}
    </div>
  )
}
