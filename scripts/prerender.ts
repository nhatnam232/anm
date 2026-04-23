/**
 * Static prerender for important routes — generates `dist/<route>/index.html`
 * with the correct <title>/<meta> tags so social-media unfurlers and search
 * crawlers see useful previews even though we ship a SPA.
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
  },
  {
    path: '/search',
    title: 'Browse all anime · Anime Wiki',
    description: 'Search and filter the full AniList catalogue.',
  },
  {
    path: '/season',
    title: 'Seasonal anime chart · Anime Wiki',
    description: 'See what\'s airing this season — Winter, Spring, Summer, Fall.',
  },
  {
    path: '/schedule',
    title: 'Weekly anime schedule · Anime Wiki',
    description: 'A 7-day calendar of upcoming anime episodes.',
  },
  {
    path: '/ranking',
    title: 'Top rated anime · Anime Wiki',
    description: 'The highest-scored anime according to AniList ratings.',
  },
  {
    path: '/collections',
    title: 'Community collections · Anime Wiki',
    description: 'Curated anime lists shared by fans.',
  },
  {
    path: '/compare',
    title: 'Compare anime · Anime Wiki',
    description: 'Side-by-side comparison of scores, studios, and ratings.',
  },
  {
    path: '/tos',
    title: 'Terms of Service · Anime Wiki',
    description: 'Legal terms governing use of Anime Wiki.',
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

async function main() {
  const indexHtml = await fs.readFile(path.join(DIST, 'index.html'), 'utf8')

  for (const route of STATIC_ROUTES) {
    const outPath =
      route.path === '/'
        ? path.join(DIST, 'index.html')
        : path.join(DIST, route.path.replace(/^\//, ''), 'index.html')
    const html = injectMeta(indexHtml, route)
    await fs.mkdir(path.dirname(outPath), { recursive: true })
    await fs.writeFile(outPath, html, 'utf8')
    console.log('✓ prerendered', route.path, '→', path.relative(DIST, outPath))
  }

  console.log(`\nDone — ${STATIC_ROUTES.length} routes prerendered to dist/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
