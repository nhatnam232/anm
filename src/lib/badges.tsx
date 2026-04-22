import { Crown, Flame, Leaf, Shield, Sparkles, Star, Video } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * User badges system. Each badge has:
 *   - id            stored in profiles.badges[] (or computed at runtime)
 *   - icon          lucide-react icon
 *   - labelEn/labelVi
 *   - tone          tailwind class set: text + bg + border + glow ring
 *
 * Manual badges (mod, admin) come from `profiles.badges` array (string[]).
 * Auto badges (newcomer, member, active, top_fan, reviewer) are derived from
 * counters/timestamps so we never need to backfill them.
 */

export type BadgeId =
  | 'newcomer'
  | 'member'
  | 'active'
  | 'top_fan'
  | 'reviewer'
  | 'mod'
  | 'admin'

export type BadgeDef = {
  id: BadgeId
  icon: React.ComponentType<{ className?: string }>
  labelEn: string
  labelVi: string
  description: string
  /** outer pill className (border + bg + text) */
  tone: string
  /** small outline border-only style for use over an avatar overlay */
  ring: string
}

export const BADGES: Record<BadgeId, BadgeDef> = {
  newcomer: {
    id: 'newcomer',
    icon: Leaf,
    labelEn: 'Newcomer',
    labelVi: 'Người mới',
    description: 'Account younger than 7 days',
    tone: 'text-slate-200 bg-slate-700/40 border-slate-500/40',
    ring: 'ring-slate-400/40',
  },
  member: {
    id: 'member',
    icon: Sparkles,
    labelEn: 'Member',
    labelVi: 'Thành viên',
    description: 'Member for 7+ days',
    tone: 'text-violet-200 bg-violet-500/15 border-violet-400/40',
    ring: 'ring-violet-400/50',
  },
  active: {
    id: 'active',
    icon: Flame,
    labelEn: 'Active',
    labelVi: 'Năng nổ',
    description: 'Posted 10+ comments',
    tone: 'text-orange-200 bg-orange-500/15 border-orange-400/40',
    ring: 'ring-orange-400/50',
  },
  top_fan: {
    id: 'top_fan',
    icon: Star,
    labelEn: 'Top Fan',
    labelVi: 'Fan cứng',
    description: '30+ anime in library',
    tone: 'text-amber-200 bg-amber-500/15 border-amber-400/40',
    ring: 'ring-amber-400/50',
  },
  reviewer: {
    id: 'reviewer',
    icon: Video,
    labelEn: 'Pro Reviewer',
    labelVi: 'Reviewer',
    description: '20+ reviews',
    tone: 'text-pink-200 bg-pink-500/15 border-pink-400/40',
    ring: 'ring-pink-400/50',
  },
  mod: {
    id: 'mod',
    icon: Shield,
    labelEn: 'Mod',
    labelVi: 'Quản trị',
    description: 'Granted by admins',
    tone: 'text-sky-200 bg-sky-500/15 border-sky-400/40',
    ring: 'ring-sky-400/60',
  },
  admin: {
    id: 'admin',
    icon: Crown,
    labelEn: 'Admin',
    labelVi: 'Sáng lập',
    description: 'Site admin',
    tone:
      'text-yellow-100 bg-gradient-to-r from-yellow-500/30 via-amber-400/30 to-orange-500/30 border-yellow-300/60',
    ring: 'ring-yellow-300/70',
  },
}

export type UserStats = {
  createdAt?: string | Date | null
  commentsCount?: number
  libraryCount?: number
  reviewsCount?: number
}

/**
 * Compute the list of auto-earned badges from a user's stats. Manual badges
 * (mod / admin) are added separately by the caller from profile.badges[].
 */
export function computeAutoBadges(stats: UserStats): BadgeId[] {
  const out: BadgeId[] = []
  const now = Date.now()
  const created = stats.createdAt ? new Date(stats.createdAt).getTime() : now
  const ageDays = Math.max(0, (now - created) / 86_400_000)

  if (ageDays < 7) out.push('newcomer')
  else out.push('member')

  if ((stats.commentsCount ?? 0) >= 10) out.push('active')
  if ((stats.libraryCount ?? 0) >= 30) out.push('top_fan')
  if ((stats.reviewsCount ?? 0) >= 20) out.push('reviewer')

  return out
}

export function mergeBadges(autoBadges: BadgeId[], manualBadges?: string[] | null): BadgeId[] {
  const allowed = new Set<BadgeId>(Object.keys(BADGES) as BadgeId[])
  const manual = (manualBadges ?? []).filter((b): b is BadgeId => allowed.has(b as BadgeId))
  // Dedupe + preserve order: manual first (priority for display), then auto.
  return Array.from(new Set<BadgeId>([...manual, ...autoBadges]))
}

// ─── Visual components ───────────────────────────────────────────────────────

export function BadgePill({
  id,
  lang = 'en',
  size = 'sm',
}: {
  id: BadgeId
  lang?: 'vi' | 'en'
  size?: 'xs' | 'sm' | 'md'
}): ReactNode {
  const def = BADGES[id]
  if (!def) return null
  const Icon = def.icon
  const sizing =
    size === 'xs'
      ? 'gap-1 px-1.5 py-0.5 text-[10px]'
      : size === 'md'
        ? 'gap-1.5 px-2.5 py-1 text-sm'
        : 'gap-1 px-2 py-0.5 text-xs'
  const iconSize = size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3'
  return (
    <span
      title={def.description}
      className={`inline-flex items-center rounded-full border font-medium ${def.tone} ${sizing}`}
    >
      <Icon className={iconSize} />
      {lang === 'vi' ? def.labelVi : def.labelEn}
    </span>
  )
}

/**
 * Compact list of badges (top 3) for inline use next to a username.
 */
export function BadgeRow({
  ids,
  lang = 'en',
  max = 3,
  size = 'sm',
}: {
  ids: BadgeId[]
  lang?: 'vi' | 'en'
  max?: number
  size?: 'xs' | 'sm' | 'md'
}): ReactNode {
  if (!ids?.length) return null
  const visible = ids.slice(0, max)
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {visible.map((id) => (
        <BadgePill key={id} id={id} lang={lang} size={size} />
      ))}
    </span>
  )
}
