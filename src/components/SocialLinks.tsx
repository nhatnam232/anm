/**
 * Brand-coloured Discord + Facebook badges. Used in Footer + Navbar so the
 * community can find us in 2 clicks from anywhere on the site.
 */
import { Facebook } from 'lucide-react'

export const DISCORD_INVITE = 'https://dsc.gg/animewiki'
export const FACEBOOK_URL   = 'https://facebook.com/jadesminos'

type Props = {
  /** Render as compact icon-only buttons (for navbar). Default false → labelled pills. */
  compact?: boolean
  className?: string
}

export default function SocialLinks({ compact = false, className }: Props) {
  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 ${className ?? ''}`}>
        <a
          href={DISCORD_INVITE}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Join our Discord community"
          title="Join our Discord community"
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-[#5865F2]/15 hover:text-[#5865F2]"
        >
          <DiscordIcon className="h-4 w-4" />
        </a>
        <a
          href={FACEBOOK_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Follow on Facebook"
          title="Follow on Facebook"
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-[#1877F2]/15 hover:text-[#1877F2]"
        >
          <Facebook className="h-4 w-4" />
        </a>
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ''}`}>
      <a
        href={DISCORD_INVITE}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-[#5865F2] px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-[#4752C4] hover:shadow-lg"
      >
        <DiscordIcon className="h-4 w-4" />
        Discord
      </a>
      <a
        href={FACEBOOK_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-[#1877F2] px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-[#125ec1] hover:shadow-lg"
      >
        <Facebook className="h-4 w-4" />
        Facebook
      </a>
    </div>
  )
}

/**
 * Inline Discord wordmark icon (the lucide-react package doesn't ship one).
 * Path lifted from the official Discord brand kit (simplified to a single path).
 */
export function DiscordIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3a14.61 14.61 0 0 0-.66 1.343 18.27 18.27 0 0 0-5.487 0A12.51 12.51 0 0 0 9.77 3a19.74 19.74 0 0 0-3.76 1.371C2.05 10.36 1.027 16.196 1.539 21.95a19.92 19.92 0 0 0 6.073 3.066 14.43 14.43 0 0 0 1.302-2.106 12.86 12.86 0 0 1-2.05-.987c.172-.126.34-.258.504-.394 3.927 1.81 8.18 1.81 12.066 0 .164.137.332.268.504.394a12.86 12.86 0 0 1-2.054.987 14.45 14.45 0 0 0 1.303 2.106 19.88 19.88 0 0 0 6.077-3.066c.598-6.65-1.022-12.435-4.247-17.581ZM8.02 18.27c-1.21 0-2.205-1.111-2.205-2.476 0-1.366.974-2.479 2.205-2.479 1.232 0 2.226 1.113 2.205 2.479 0 1.365-.973 2.476-2.205 2.476Zm7.961 0c-1.21 0-2.205-1.111-2.205-2.476 0-1.366.973-2.479 2.205-2.479 1.232 0 2.225 1.113 2.205 2.479 0 1.365-.973 2.476-2.205 2.476Z" />
    </svg>
  )
}
