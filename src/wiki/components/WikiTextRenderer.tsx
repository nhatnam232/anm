import { Fragment } from 'react'
import { parseWikiText } from '@/wiki/utils/parser'
import WikiLink from './WikiLink'

type Props = {
  text: string
  className?: string
}

/**
 * Renders wiki body text — newlines become paragraph breaks, `[[Name|id]]`
 * tags become inline `<WikiLink>` (with hover-card preview).
 */
export default function WikiTextRenderer({ text, className = '' }: Props) {
  const segments = parseWikiText(text)

  return (
    <div className={`whitespace-pre-line text-sm leading-relaxed text-text ${className}`}>
      {segments.map((seg, i) => {
        if (seg.type === 'text') return <Fragment key={i}>{seg.text}</Fragment>
        return (
          <WikiLink
            key={i}
            label={seg.label}
            targetId={seg.targetId}
          />
        )
      })}
    </div>
  )
}
