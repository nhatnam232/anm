import { useState, type ReactNode } from 'react'

/**
 * Tiny safe markdown → React renderer.
 *
 * Supports:
 *   - paragraph + line breaks
 *   - **bold**, __bold__
 *   - *italic*, _italic_
 *   - `code`
 *   - [text](url) links (rel=noreferrer, target=_blank)
 *   - ~~strike~~
 *   - ||spoiler||  ← click to reveal (anime-friendly!)
 *   - bare URLs http(s)://...
 *   - HTML tags `<br>` and `<i>` (AniList sometimes mixes these in)
 *
 * No external dependency to keep the bundle small. Anything not matched is
 * rendered as plain text — XSS-safe because we never use dangerouslySetInnerHTML.
 */

const URL_REGEX = /https?:\/\/[^\s)<>]+[^\s.,;:!?)<>'"\]]/g

/**
 * Inline spoiler component. Hidden until clicked. Once revealed it stays
 * revealed for the lifetime of the component (no toggle back) so users don't
 * accidentally hide it again while reading.
 */
function Spoiler({ children }: { children: ReactNode }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <span
      className={`spoiler-tag${revealed ? ' is-revealed' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={revealed ? 'Spoiler revealed' : 'Click to reveal spoiler'}
      title={revealed ? 'Spoiler revealed' : 'Click to reveal spoiler'}
      onClick={(e) => {
        e.stopPropagation()
        if (!revealed) setRevealed(true)
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !revealed) {
          e.preventDefault()
          setRevealed(true)
        }
      }}
    >
      {children}
    </span>
  )
}

function inline(text: string, key = 0): ReactNode[] {
  if (!text) return []
  // Strip simple HTML linebreaks first.
  text = text.replace(/<br\s*\/?>/gi, '\n')
  // Convert <i>...</i> to *...*
  text = text.replace(/<i>(.+?)<\/i>/gi, '*$1*')
  text = text.replace(/<b>(.+?)<\/b>/gi, '**$1**')

  const tokens: Array<{
    type: 'text' | 'link' | 'bold' | 'italic' | 'code' | 'strike' | 'spoiler'
    value: string
    href?: string
  }> = []

  // Strategy: iterate index by index and try matching patterns.
  let i = 0
  let buf = ''
  const flush = () => {
    if (buf) {
      tokens.push({ type: 'text', value: buf })
      buf = ''
    }
  }

  while (i < text.length) {
    // ||spoiler|| — must come first because it shares character `|`.
    if (text.startsWith('||', i)) {
      const end = text.indexOf('||', i + 2)
      if (end > -1 && end !== i + 2) {
        flush()
        tokens.push({ type: 'spoiler', value: text.slice(i + 2, end) })
        i = end + 2
        continue
      }
    }

    // markdown link [text](url)
    if (text[i] === '[') {
      const closeBracket = text.indexOf(']', i + 1)
      if (closeBracket > -1 && text[closeBracket + 1] === '(') {
        const closeParen = text.indexOf(')', closeBracket + 2)
        if (closeParen > -1) {
          flush()
          tokens.push({
            type: 'link',
            value: text.slice(i + 1, closeBracket),
            href: text.slice(closeBracket + 2, closeParen),
          })
          i = closeParen + 1
          continue
        }
      }
    }

    // **bold** or __bold__
    if ((text.startsWith('**', i) || text.startsWith('__', i))) {
      const marker = text.slice(i, i + 2)
      const end = text.indexOf(marker, i + 2)
      if (end > -1) {
        flush()
        tokens.push({ type: 'bold', value: text.slice(i + 2, end) })
        i = end + 2
        continue
      }
    }

    // ~~strike~~
    if (text.startsWith('~~', i)) {
      const end = text.indexOf('~~', i + 2)
      if (end > -1) {
        flush()
        tokens.push({ type: 'strike', value: text.slice(i + 2, end) })
        i = end + 2
        continue
      }
    }

    // *italic* or _italic_  (single char, but skip if next is same → already handled above)
    if ((text[i] === '*' || text[i] === '_') && text[i + 1] !== text[i]) {
      const marker = text[i]
      const end = text.indexOf(marker, i + 1)
      if (end > -1 && end !== i + 1) {
        flush()
        tokens.push({ type: 'italic', value: text.slice(i + 1, end) })
        i = end + 1
        continue
      }
    }

    // `code`
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1)
      if (end > -1) {
        flush()
        tokens.push({ type: 'code', value: text.slice(i + 1, end) })
        i = end + 1
        continue
      }
    }

    buf += text[i]
    i++
  }
  flush()

  // Second pass: turn bare URLs into links inside text tokens.
  const out: ReactNode[] = []
  let n = 0
  for (const tok of tokens) {
    const k = `${key}-${n++}`
    if (tok.type === 'link') {
      out.push(
        <a
          key={k}
          href={tok.href}
          target="_blank"
          rel="noreferrer noopener"
          className="text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
        >
          {tok.value}
        </a>,
      )
    } else if (tok.type === 'bold') {
      out.push(<strong key={k} className="font-semibold text-text">{inline(tok.value, n)}</strong>)
    } else if (tok.type === 'italic') {
      out.push(<em key={k}>{inline(tok.value, n)}</em>)
    } else if (tok.type === 'strike') {
      out.push(<s key={k} className="opacity-70">{inline(tok.value, n)}</s>)
    } else if (tok.type === 'spoiler') {
      out.push(<Spoiler key={k}>{inline(tok.value, n)}</Spoiler>)
    } else if (tok.type === 'code') {
      out.push(
        <code key={k} className="rounded bg-white/10 px-1.5 py-0.5 text-[0.85em] text-amber-200">
          {tok.value}
        </code>,
      )
    } else {
      // Promote bare URLs inside plain text.
      const parts: ReactNode[] = []
      let lastIndex = 0
      tok.value.replace(URL_REGEX, (match, offset: number) => {
        if (offset > lastIndex) parts.push(tok.value.slice(lastIndex, offset))
        parts.push(
          <a
            key={`${k}-u-${offset}`}
            href={match}
            target="_blank"
            rel="noreferrer noopener"
            className="text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
          >
            {match}
          </a>,
        )
        lastIndex = offset + match.length
        return match
      })
      if (lastIndex < tok.value.length) parts.push(tok.value.slice(lastIndex))
      out.push(<span key={k}>{parts.length ? parts : tok.value}</span>)
    }
  }
  return out
}

export function MarkdownText({ children, className }: { children: string; className?: string }) {
  if (!children?.trim()) return null
  // Split into paragraphs by blank lines, preserve single line breaks inside as <br/>.
  const paragraphs = children.replace(/\r\n/g, '\n').split(/\n{2,}/)
  return (
    <div className={className}>
      {paragraphs.map((p, idx) => {
        const lines = p.split('\n')
        return (
          <p key={idx} className={idx > 0 ? 'mt-4' : undefined}>
            {lines.map((line, lineIdx) => (
              <span key={lineIdx}>
                {inline(line, lineIdx)}
                {lineIdx < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}
