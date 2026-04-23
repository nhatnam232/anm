/**
 * Lightweight bot / crawler detection.
 *
 * We use this for two main reasons:
 *   1. Skip the ToS modal so SEO crawlers (Googlebot, Bingbot, FB share bot…)
 *      don't waste their render budget on a popup they cannot dismiss.
 *   2. Optionally serve pre-rendered HTML to social-media unfurlers.
 *
 * The list is intentionally narrow — false positives are worse than missing one
 * obscure crawler. UA snippets are case-insensitive substring matches.
 */

const BOT_PATTERNS = [
  // Search engines
  'googlebot',
  'bingbot',
  'slurp',                  // Yahoo
  'duckduckbot',
  'baiduspider',
  'yandex',
  'sogou',
  'exabot',
  // Social-media unfurlers
  'facebookexternalhit',
  'facebot',
  'twitterbot',
  'discordbot',
  'slackbot',
  'telegrambot',
  'linkedinbot',
  'whatsapp',
  'pinterestbot',
  'redditbot',
  'embedly',
  // Generic markers
  'preview',
  'spider',
  'crawler',
  'bot/',
  ' bot',
  'headlesschrome',
  'lighthouse',
  'pagespeed',
]

/** True if the User-Agent string looks like a known bot. */
export function isBotUserAgent(ua?: string | null): boolean {
  if (!ua) return false
  const lower = ua.toLowerCase()
  return BOT_PATTERNS.some((needle) => lower.includes(needle))
}

/**
 * Browser-side helper using `navigator.userAgent`. Safe to call from React.
 * Returns false in non-browser environments (SSR, build-time prerender host).
 */
export function isBotEnvironment(): boolean {
  if (typeof navigator === 'undefined') return false
  return isBotUserAgent(navigator.userAgent)
}
