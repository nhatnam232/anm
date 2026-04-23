import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  ArrowLeft,
  Bold,
  CheckCircle2,
  Italic,
  Link as LinkIcon,
  Save,
  Strikethrough,
} from 'lucide-react'
import WikiLayout from '@/wiki/components/WikiLayout'
import { getCharacter, getStory } from '@/wiki/registry'
import { useWikiText } from '@/wiki/i18n'

/**
 * Wiki edit page — supports `/edit/character/:id` and `/edit/story/:id`.
 *
 * Notes for reviewers:
 *   - We deliberately don't *persist* edits yet. The UI is a faithful
 *     mock-up of the contribution flow: rich text editor + edit-summary
 *     field + "Submit for Review" button. Real persistence would post to
 *     a Supabase table `wiki_edit_suggestions` (analogous to the existing
 *     `anime_edit_suggestions`) and add a moderator approval queue.
 *   - The "Insert character link" button shows a tiny prompt — production
 *     should swap this with a slash-menu autocomplete pulling from
 *     `searchCharacters()`.
 */
export default function WikiEdit() {
  const params = useParams<{ kind?: string; id?: string }>()
  const kind = params.kind as 'character' | 'story' | undefined
  const id = params.id ?? ''
  const navigate = useNavigate()
  const t = useWikiText()

  const target =
    kind === 'character' ? getCharacter(id) : kind === 'story' ? getStory(id) : null
  const initialBody =
    kind === 'character'
      ? (target as ReturnType<typeof getCharacter>)?.bio ?? ''
      : (target as ReturnType<typeof getStory>)?.body ?? ''

  const [summary, setSummary] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // Configure TipTap editor with the starter set; convert wiki tags into
  // markdown-style spans on load so authors see plain text + can keep editing.
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialBody.replace(/\n/g, '<br/>'),
    editorProps: {
      attributes: {
        class:
          'min-h-[280px] w-full rounded-xl border border-border bg-background p-4 text-sm leading-relaxed text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
      },
    },
  })

  // Reset editor when the URL changes (e.g. user navigates from one
  // character edit to another without unmounting).
  useEffect(() => {
    if (editor && initialBody) {
      editor.commands.setContent(initialBody.replace(/\n/g, '<br/>'))
    }
  }, [editor, initialBody])

  if (!target) {
    return (
      <WikiLayout showSearch={false}>
        <div className="rounded-3xl border border-border bg-card p-12 text-center">
          <p className="text-lg font-semibold text-text">
            {kind === 'story' ? t.notFoundStory(id) : t.notFoundCharacter(id)}
          </p>
          <Link to="/wiki" className="mt-4 inline-block text-sm text-primary hover:underline">
            {t.backToWikiHome}
          </Link>
        </div>
      </WikiLayout>
    )
  }

  const insertCharacterLink = () => {
    const slug = window.prompt('Character slug (e.g. "frieren"):')
    if (!slug) return
    const display = window.prompt('Display name to show:', slug) ?? slug
    editor?.chain().focus().insertContent(`[[${display}|${slug}]]`).run()
  }

  const handleSubmit = () => {
    if (!editor) return
    setSubmitted(true)
    setTimeout(() => navigate(`/wiki/${kind}/${id}`), 1200)
  }

  const titleLabel =
    kind === 'character'
      ? (target as ReturnType<typeof getCharacter>)!.name
      : (target as ReturnType<typeof getStory>)!.title

  return (
    <WikiLayout showSearch={false}>
      <div className="mb-4 flex items-center gap-2 text-sm">
        <Link
          to={`/wiki/${kind}/${id}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-text-muted hover:border-primary hover:text-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.backToWikiHome}
        </Link>
        <h1 className="text-lg font-bold text-text">
          {t.editing}: <span className="text-primary">{titleLabel}</span>
        </h1>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-xl">
        {/* Toolbar — TipTap exposes commands through editor.chain() */}
        <div className="mb-3 flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1">
          <ToolbarBtn
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={editor?.isActive('bold')}
            label={t.bold}
            icon={<Bold className="h-3.5 w-3.5" />}
          />
          <ToolbarBtn
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={editor?.isActive('italic')}
            label={t.italic}
            icon={<Italic className="h-3.5 w-3.5" />}
          />
          <ToolbarBtn
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            active={editor?.isActive('strike')}
            label={t.strike}
            icon={<Strikethrough className="h-3.5 w-3.5" />}
          />
          <span className="mx-1 h-6 w-px bg-border" />
          <ToolbarBtn
            onClick={insertCharacterLink}
            label={t.insertLink}
            icon={<LinkIcon className="h-3.5 w-3.5" />}
          />
        </div>

        <EditorContent editor={editor} />

        {/* Edit summary — like a Wikipedia "edit summary" / GitHub commit msg */}
        <div className="mt-5">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-muted">
            {t.editSummaryLabel}
          </label>
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={t.editSummaryPlaceholder}
            maxLength={120}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text focus:border-primary focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-text-muted">{summary.length}/120</p>
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <Link
            to={`/wiki/${kind}/${id}`}
            className="rounded-full border border-border px-4 py-2 text-sm text-text-muted hover:border-primary hover:text-text"
          >
            {t.cancel}
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitted || !summary.trim()}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-primary-hover disabled:opacity-50 keep-white-on-light"
          >
            {submitted ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {t.submitted}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {t.submitForReview}
              </>
            )}
          </button>
        </div>
      </div>
    </WikiLayout>
  )
}

function ToolbarBtn({
  onClick,
  active,
  label,
  icon,
}: {
  onClick: () => void
  active?: boolean
  label: string
  icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? 'bg-primary/15 text-primary'
          : 'text-text-muted hover:bg-card hover:text-text'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
