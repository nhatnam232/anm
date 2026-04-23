import { Crown, Flame, Leaf, Shield, Sparkles, Star, Video } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * User badges & permission system. Each badge has:
 *   - id            stored in profiles.badges[] (or computed at runtime)
 *   - icon          lucide-react icon
 *   - labelEn/labelVi
 *   - tone          tailwind class set: text + bg + border + glow ring
 *
 * Manual badges (mod, admin, owner) come from `profiles.badges` array (string[]).
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
  | 'owner'

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
  /** numeric weight — higher wins when picking the "primary" badge for a user */
  weight: number
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
    weight: 5,
  },
  member: {
    id: 'member',
    icon: Sparkles,
    labelEn: 'Member',
    labelVi: 'Thành viên',
    description: 'Member for 7+ days',
    tone: 'text-violet-200 bg-violet-500/15 border-violet-400/40',
    ring: 'ring-violet-400/50',
    weight: 10,
  },
  active: {
    id: 'active',
    icon: Flame,
    labelEn: 'Active',
    labelVi: 'Năng nổ',
    description: 'Posted 10+ comments',
    tone: 'text-orange-200 bg-orange-500/15 border-orange-400/40',
    ring: 'ring-orange-400/50',
    weight: 20,
  },
  top_fan: {
    id: 'top_fan',
    icon: Star,
    labelEn: 'Top Fan',
    labelVi: 'Fan cứng',
    description: '30+ anime in library',
    tone: 'text-amber-200 bg-amber-500/15 border-amber-400/40',
    ring: 'ring-amber-400/50',
    weight: 25,
  },
  reviewer: {
    id: 'reviewer',
    icon: Video,
    labelEn: 'Pro Reviewer',
    labelVi: 'Reviewer',
    description: '20+ reviews',
    tone: 'text-pink-200 bg-pink-500/15 border-pink-400/40',
    ring: 'ring-pink-400/50',
    weight: 30,
  },
  mod: {
    id: 'mod',
    icon: Shield,
    labelEn: 'Mod',
    labelVi: 'Quản trị',
    description: 'Granted by admins — can delete other users\' comments',
    tone: 'text-sky-200 bg-sky-500/15 border-sky-400/40',
    ring: 'ring-sky-400/60',
    weight: 80,
  },
  admin: {
    id: 'admin',
    icon: Crown,
    labelEn: 'Admin',
    labelVi: 'Sáng lập',
    description: 'Site administrator — full moderation rights',
    tone:
      'text-yellow-100 bg-gradient-to-r from-yellow-500/30 via-amber-400/30 to-orange-500/30 border-yellow-300/60',
    ring: 'ring-yellow-300/70',
    weight: 90,
  },
  owner: {
    id: 'owner',
    icon: Crown,
    labelEn: 'Owner',
    labelVi: 'Tác giả',
    description: 'Project owner — supreme authority',
    tone:
      'text-rose-100 bg-gradient-to-r from-rose-500/40 via-fuchsia-500/40 to-purple-500/40 border-rose-300/70',
    ring: 'ring-rose-300/80',
    weight: 100,
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
 * (mod / admin / owner) are added separately by the caller from profile.badges[].
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
  // Sort by weight desc so the most prestigious badges show first.
  const merged = Array.from(new Set<BadgeId>([...manual, ...autoBadges]))
  return merged.sort((a, b) => BADGES[b].weight - BADGES[a].weight)
}

/**
 * Pick the highest-weight badge to use for visual styling (avatar ring color, etc.)
 * Returns null if the user has no badges.
 */
export function getPrimaryBadge(ids: BadgeId[]): BadgeId | null {
  if (!ids.length) return null
  return ids[0] // already sorted desc by mergeBadges
}

/**
 * Returns the Tailwind classes for the avatar ring based on the primary badge.
 * Falls back to a subtle violet ring for users without any standout badge.
 */
export function getAvatarRingClass(ids: BadgeId[]): string {
  const primary = getPrimaryBadge(ids)
  if (!primary) return 'ring-2 ring-violet-400/30'
  switch (primary) {
    case 'owner':
      return 'ring-2 ring-rose-400/80 ring-offset-2 ring-offset-background shadow-[0_0_18px_rgba(244,63,94,0.5)]'
    case 'admin':
      return 'ring-2 ring-yellow-300/80 ring-offset-2 ring-offset-background shadow-[0_0_18px_rgba(252,211,77,0.45)]'
    case 'mod':
      return 'ring-2 ring-sky-400/70 ring-offset-2 ring-offset-background shadow-[0_0_14px_rgba(56,189,248,0.45)]'
    case 'reviewer':
      return 'ring-2 ring-pink-400/70 ring-offset-1 ring-offset-background'
    case 'top_fan':
      return 'ring-2 ring-amber-400/70 ring-offset-1 ring-offset-background'
    case 'active':
      return 'ring-2 ring-orange-400/60 ring-offset-1 ring-offset-background'
    case 'member':
      return 'ring-2 ring-violet-400/50'
    case 'newcomer':
    default:
      return 'ring-2 ring-slate-400/40'
  }
}

// ─── Permissions ────────────────────────────────────────────────────────────
// Centralized permission helpers — keep authorization logic in one place so
// future role changes don't require hunting through dozens of components.

export type ProfileLike = {
  id?: string
  badges?: string[] | null
} | null | undefined

/** True if the profile carries the "owner" badge. */
export function isOwner(profile: ProfileLike): boolean {
  return Boolean(profile?.badges?.includes('owner'))
}

/** True if the profile carries the "admin" badge (or higher). */
export function isAdmin(profile: ProfileLike): boolean {
  return Boolean(profile?.badges?.some((b) => b === 'admin' || b === 'owner'))
}

/** True if the profile is admin/owner OR a moderator. */
export function isModerator(profile: ProfileLike): boolean {
  return Boolean(
    profile?.badges?.some((b) => b === 'mod' || b === 'admin' || b === 'owner'),
  )
}

/**
 * Can the given user delete a comment? Authors can always delete their own.
 * Moderators and above can delete anyone's content.
 */
export function canDeleteComment(viewerProfile: ProfileLike, commentAuthorId: string | null): boolean {
  if (!viewerProfile?.id) return false
  if (commentAuthorId && commentAuthorId === viewerProfile.id) return true
  return isModerator(viewerProfile)
}

/** Returns 'owner' | 'admin' | 'mod' | null — the highest moderation role. */
export function getStaffRole(profile: ProfileLike): 'owner' | 'admin' | 'mod' | null {
  if (isOwner(profile)) return 'owner'
  if (isAdmin(profile)) return 'admin'
  if (isModerator(profile)) return 'mod'
  return null
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
