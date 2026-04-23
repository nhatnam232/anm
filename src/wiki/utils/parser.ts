/**
 * Wiki text parser.
 *
 * Turns raw body text (with `[[Display Name|character_id]]` markup) into a
 * list of segments that the renderer can map to plain text + <WikiLink> JSX.
 *
 * We deliberately keep this string-based (no full markdown engine) — wiki
 * authors only need to know one syntax rule. Linebreaks become <br/> at
 * render time.
 */

export type ParsedSegment =
  | { type: 'text'; text: string }
  | { type: 'link'; label: string; targetId: string }

const LINK_RE = /\[\[([^\]|]+)\|([^\]]+)\]\]/g

export function parseWikiText(text: string): ParsedSegment[] {
  if (!text) return []
  const out: ParsedSegment[] = []
  let lastIndex = 0
  for (const m of text.matchAll(LINK_RE)) {
    const idx = m.index ?? 0
    if (idx > lastIndex) {
      out.push({ type: 'text', text: text.slice(lastIndex, idx) })
    }
    out.push({ type: 'link', label: m[1].trim(), targetId: m[2].trim() })
    lastIndex = idx + m[0].length
  }
  if (lastIndex < text.length) {
    out.push({ type: 'text', text: text.slice(lastIndex) })
  }
  return out
}

/** Strip wiki tags entirely — handy for plaintext previews / search snippets. */
export function stripWikiTags(text: string): string {
  return text.replace(LINK_RE, (_, label) => label)
}
