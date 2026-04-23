import { Helmet } from 'react-helmet-async'

type Props = {
  /** Page title — appended with ` · Anime Wiki` automatically. */
  title?: string
  /** ~155-char description for search engines + open-graph. */
  description?: string
  /** Absolute or root-relative image URL for social-media unfurls. */
  image?: string | null
  /** Canonical URL (defaults to current page). */
  url?: string
  /** og:type — 'article' for anime pages, 'profile' for users, default 'website'. */
  type?: 'website' | 'article' | 'profile' | 'video.other'
  /** Locale to advertise (defaults to 'en_US' / 'vi_VN'). */
  locale?: string
  /** Additional structured data — JSON-LD object, will be JSON.stringify'd. */
  jsonLd?: Record<string, unknown>
  /** When true, ask crawlers not to index (e.g. profile/admin pages). */
  noIndex?: boolean
}

const SITE_NAME = 'Anime Wiki'
const SITE_URL = 'https://animewiki.vercel.app'
const DEFAULT_OG_IMAGE = `${SITE_URL}/favicon.svg`

/**
 * Drop-in <SEO /> component. Each detail page (AnimeDetail, CharacterDetail,
 * Studio, Profile, Collection) should render this once near the top so the
 * <title> and Open-Graph tags are correct when crawlers / unfurlers fetch the
 * raw HTML (combined with `npm run build:prerender` for true SSR-equivalent SEO).
 */
export default function SEO({
  title,
  description,
  image,
  url,
  type = 'website',
  locale,
  jsonLd,
  noIndex = false,
}: Props) {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : SITE_NAME
  const desc =
    description ??
    'Anime Wiki — the friendliest place to discover seasonal anime, build your library, and chat with fans.'
  const ogImage = image && image.startsWith('http')
    ? image
    : image
      ? `${SITE_URL}${image.startsWith('/') ? '' : '/'}${image}`
      : DEFAULT_OG_IMAGE
  const canonical =
    url ?? (typeof window !== 'undefined' ? window.location.href : SITE_URL)
  const ogLocale = locale ?? (typeof navigator !== 'undefined' && navigator.language?.startsWith('vi') ? 'vi_VN' : 'en_US')

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {noIndex ? <meta name="robots" content="noindex,nofollow" /> : null}
      <link rel="canonical" href={canonical} />

      {/* Open Graph (Facebook, Discord, LinkedIn, Telegram) */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={ogLocale} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLd ? (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      ) : null}
    </Helmet>
  )
}

/**
 * Convenience builder for an Anime page's structured data (schema.org/TVSeries).
 * Pass the raw anime object you'd render and we'll produce the correct JSON-LD.
 */
export function buildAnimeJsonLd(anime: {
  id: number
  title: string
  cover_image: string
  synopsis?: string | null
  score?: number | null
  episodes?: number | null
  status?: string | null
  studio_name?: string | null
  aired_from?: string | null
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: anime.title,
    image: anime.cover_image,
    description: anime.synopsis ?? undefined,
    numberOfEpisodes: anime.episodes ?? undefined,
    productionCompany: anime.studio_name
      ? { '@type': 'Organization', name: anime.studio_name }
      : undefined,
    datePublished: anime.aired_from ?? undefined,
    aggregateRating:
      typeof anime.score === 'number' && anime.score > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: anime.score,
            bestRating: 10,
            worstRating: 1,
          }
        : undefined,
    url: `${SITE_URL}/anime/${anime.id}`,
  }
}
