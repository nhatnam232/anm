/**
 * Static prerender for important routes — generates `dist/<route>/index.html`
 * with the correct <title>/<meta> tags so social-media unfurlers and search
 * crawlers see useful previews even though we ship a SPA.
 *
 * Also generates `dist/sitemap.xml` from the same route table. It used to be a
 * hand-maintained file in public/ that listed a handful of URLs and drifted
 * out of date every time a route was added (it was missing /browse, /wiki,
 * /activity...). Deriving it here means adding a route to STATIC_ROUTES is the
 * only step needed.
 *
 * Run via `npm run build:prerender` (which runs vite build first).
 *
 * NOTE: This is intentionally a *light* SSR — we don't render the full React
 * tree. Vite already produced `dist/index.html`; we just inject custom
 * <meta> tags per popular route (homepage, top anime detail pages, etc.).
 *
 * For a full SSR setup later, swap this with vike (vite-plugin-ssr).
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'

const SITE_URL = process.env.SITE_URL || 'https://animewiki.vercel.app'
const DIST = path.resolve('dist')

type RouteMeta = {
  path: string
  title: string
  description: string
  image?: string
  /** Sitemap hints. Omitted entries fall back to weekly / 0.5. */
  changefreq?: 'daily' | 'weekly' | 'monthly' | 'yearly'
  priority?: number
  /** Set false for routes that should be crawled but not prerendered. */
  sitemapOnly?: boolean
}

/**
 * Static set of high-traffic routes to prerender.
 *
 * For dynamic anime/character pages, fetch the top-N from AniList here and
 * generate /anime/<id>/index.html for each — kept short for the initial
 * implementation since the API budget for AniList during build is limited.
 */
const STATIC_ROUTES: RouteMeta[] = [
  {
    path: '/',
    title: 'Anime Wiki',
    description: 'Discover seasonal anime, build your library, chat with fans.',
    changefreq: 'daily',
    priority: 1.0,
  },
  {
    path: '/search',
    title: 'Browse all anime · Anime Wiki',
    description: 'Search and filter the full AniList catalogue.',
    changefreq: 'daily',
    priority: 0.8,
  },
  {
    // Same component as /search, but this is the path the navbar links to, so
    // it is the one that should rank.
    path: '/browse',
    title: 'Browse all anime · Anime Wiki',
    description: 'Search and filter the full AniList catalogue by genre, year, format and score.',
    changefreq: 'daily',
    priority: 0.9,
  },
  {
    path: '/season',
    title: 'Seasonal anime chart · Anime Wiki',
    description: 'See what\'s airing this season — Winter, Spring, Summer, Fall.',
    changefreq: 'daily',
    priority: 0.9,
  },
  {
    path: '/schedule',
    title: 'Weekly anime schedule · Anime Wiki',
    description: 'A 7-day calendar of upcoming anime episodes.',
    changefreq: 'daily',
    priority: 0.9,
  },
  {
    path: '/ranking',
    title: 'Top rated anime · Anime Wiki',
    description: 'The highest-scored anime according to AniList ratings.',
    changefreq: 'weekly',
    priority: 0.8,
  },
  {
    path: '/collections',
    title: 'Community collections · Anime Wiki',
    description: 'Curated anime lists shared by fans.',
    changefreq: 'daily',
    priority: 0.7,
  },
  {
    path: '/compare',
    title: 'Compare anime · Anime Wiki',
    description: 'Side-by-side comparison of scores, studios, and ratings.',
    changefreq: 'monthly',
    priority: 0.6,
  },
  {
    path: '/activity',
    title: 'Community activity · Anime Wiki',
    description: 'The latest ratings, reviews and library updates from the community.',
    changefreq: 'daily',
    priority: 0.5,
  },
  {
    path: '/wiki',
    title: 'Fandom Wiki · Anime Wiki',
    description: 'Community-written character biographies and story lore.',
    changefreq: 'daily',
    priority: 0.9,
  },
  {
    path: '/wiki/all',
    title: 'All wiki articles · Anime Wiki',
    description: 'Every character and story article in the fandom wiki, in one index.',
    changefreq: 'daily',
    priority: 0.8,
  },
  {
    path: '/tos',
    title: 'Terms of Service · Anime Wiki',
    description: 'Legal terms governing use of Anime Wiki.',
    changefreq: 'yearly',
    priority: 0.3,
  },
]

function injectMeta(html: string, meta: RouteMeta): string {
  const fullUrl = `${SITE_URL}${meta.path === '/' ? '' : meta.path}`
  const ogImage = meta.image || `${SITE_URL}/favicon.svg`

  // Remove default <title>...</title> so we don't double-up
  let out = html.replace(/<title>[^<]*<\/title>/i, '')
  // Replace common existing meta description if present
  out = out.replace(/<meta\s+name="description"[^>]*>/i, '')

  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${fullUrl}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:image" content="${ogImage}" />`,
    `<meta property="og:url" content="${fullUrl}" />`,
    `<meta property="og:site_name" content="Anime Wiki" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${ogImage}" />`,
  ].join('\n    ')

  return out.replace('</head>', `    ${tags}\n  </head>`)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Builds sitemap.xml. `lastmod` is build time — accurate enough given every
 * one of these routes renders live data that changes whenever AniList does.
 */
function buildSitemap(routes: RouteMeta[]): string {
  const lastmod = new Date().toISOString().slice(0, 10)

  const entries = routes
    .map((route) => {
      const loc = `${SITE_URL}${route.path === '/' ? '/' : route.path}`
      return [
        '  <url>',
        `    <loc>${loc}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${route.changefreq ?? 'weekly'}</changefreq>`,
        `    <priority>${(route.priority ?? 0.5).toFixed(1)}</priority>`,
        '  </url>',
      ].join('\n')
    })
    .join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</urlset>',
    '',
  ].join('\n')
}

async function main() {
  const indexHtml = await fs.readFile(path.join(DIST, 'index.html'), 'utf8')

  let prerendered = 0
  for (const route of STATIC_ROUTES) {
    if (route.sitemapOnly) continue

    const outPath =
      route.path === '/'
        ? path.join(DIST, 'index.html')
        : path.join(DIST, route.path.replace(/^\//, ''), 'index.html')
    const html = injectMeta(indexHtml, route)
    await fs.mkdir(path.dirname(outPath), { recursive: true })
    await fs.writeFile(outPath, html, 'utf8')
    prerendered += 1
    console.log('✓ prerendered', route.path, '→', path.relative(DIST, outPath))
  }

  // Overwrites the copy Vite carried over from public/ — that one is only a
  // fallback for plain `npm run build`.
  const sitemapPath = path.join(DIST, 'sitemap.xml')
  await fs.writeFile(sitemapPath, buildSitemap(STATIC_ROUTES), 'utf8')
  console.log('✓ sitemap', STATIC_ROUTES.length, 'urls →', path.relative(DIST, sitemapPath))

  console.log(`\nDone — ${prerendered} routes prerendered to dist/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
