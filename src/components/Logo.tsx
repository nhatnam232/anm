type LogoProps = {
  size?: number
  showWordmark?: boolean
  className?: string
}

export default function Logo({ size = 32, showWordmark = true, className = '' }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Anime Wiki logo"
      >
        <defs>
          <linearGradient id="anmBgGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="55%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="anmTextGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f5f3ff" />
            <stop offset="100%" stopColor="#fce7f3" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#anmBgGrad)" />
        <rect
          x="2"
          y="2"
          width="60"
          height="60"
          rx="14"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.18"
          strokeWidth="1"
        />
        <path
          d="M14 46 L22 18 L30 18 L38 46 L31 46 L29.3 40 L22.7 40 L21 46 Z M24 34 L28 34 L26 26 Z"
          fill="url(#anmTextGrad)"
        />
        <path
          d="M42 46 L42 18 L48 18 L54 34 L54 18 L54 46 L48 46 L42 30 Z"
          fill="url(#anmTextGrad)"
          fillOpacity="0.95"
        />
        <circle cx="50" cy="50" r="3" fill="#fde68a" />
      </svg>
      {showWordmark && (
        <span className="flex items-baseline gap-1 font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            Anime
          </span>
          <span className="text-white">Wiki</span>
        </span>
      )}
    </span>
  )
}
