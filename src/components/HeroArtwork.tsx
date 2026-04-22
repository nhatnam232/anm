interface HeroArtworkProps {
  bannerImage?: string | null
  coverImage: string
  title: string
  heightClassName?: string
}

export default function HeroArtwork({
  bannerImage,
  coverImage,
  title,
  heightClassName = 'h-[40vh] md:h-[50vh]',
}: HeroArtworkProps) {
  const hasWideBanner = Boolean(bannerImage && bannerImage !== coverImage)
  const backdropImage = bannerImage || coverImage

  return (
    <div className={`hero-fade relative overflow-hidden ${heightClassName}`}>
      <img
        src={backdropImage}
        alt={title}
        className="absolute inset-0 h-full w-full scale-105 object-cover object-center blur-2xl"
        aria-hidden="true"
        loading="lazy"
      />

      {hasWideBanner ? (
        <img
          src={bannerImage || coverImage}
          alt={title}
          className="relative h-full w-full object-cover object-center"
          fetchPriority="high"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        <div className="relative flex h-full items-center justify-center px-6 py-10">
          <img
            src={coverImage}
            alt={title}
            className="max-h-full max-w-full rounded-2xl object-contain shadow-[0_24px_80px_rgba(15,23,42,0.65)]"
            fetchPriority="high"
          />
        </div>
      )}

      <div className="absolute inset-0 bg-slate-950/45" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_30%)]" />
    </div>
  )
}
