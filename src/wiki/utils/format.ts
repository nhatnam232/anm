/**
 * Tiny helpers shared across the wiki UI for "raw text" cases where we
 * can't drop in the full <TranslatedText> component (eg. card previews,
 * tooltips, image alt texts).
 */
import { stripWikiTags } from './parser'

/**
 * Pick the half of a `"Vietnamese text / English text"` string that matches
 * the active language. Falls back gracefully when the source isn't dual-format.
 *
 * Why we need this: legacy registry entries stored both languages joined by
 * ` / ` so the wiki could render either side without round-tripping through
 * the translate API. New entries should write Vietnamese only and rely on
 * <TranslatedText> for live translation — but we still have lots of legacy
 * strings we don't want to manually rewrite.
 */
export function pickLang(raw: string, lang: 'vi' | 'en'): string {
  if (!raw) return ''
  const idx = raw.indexOf(' / ')
  if (idx < 0) return raw
  return lang === 'en' ? raw.slice(idx + 3).trim() : raw.slice(0, idx).trim()
}

/** Compose pickLang + stripWikiTags — handy for short previews. */
export function shortPreview(raw: string, lang: 'vi' | 'en'): string {
  return stripWikiTags(pickLang(raw, lang))
}

/**
 * Wrap an external image URL through our `/api/image` proxy. Some CDNs
 * (notably AniList's `s4.anilist.co`) sporadically reject requests from
 * Vercel edge IPs / certain referrers; routing through our own server
 * sidesteps that and also lets us cache the bytes for free.
 *
 * If the URL is already same-origin or a data URI, we return it as-is.
 */
export function proxyImage(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('/')) return url
  return `/api/image?url=${encodeURIComponent(url)}`
}
