import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Loader2, MessageSquare, Reply as ReplyIcon, Send, Trash2, X } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { useLangContext } from '@/providers/LangProvider'
import { useToast } from '@/providers/ToastProvider'
import AuthModal from './AuthModal'

type EntityType = 'anime' | 'character'

type AuthorProfile = {
  display_name: string | null
  avatar_url: string | null
  username: string | null
}

type CommentRecord = {
  id: string
  user_id: string
  entity_type: EntityType
  entity_id: number
  parent_id: string | null
  body: string
  image_url: string | null
  is_deleted: boolean
  created_at: string
}

type CommentRow = CommentRecord & {
  author?: AuthorProfile | null
}

type Props = {
  entityType: EntityType
  entityId: number
}

export default function CommentSection({ entityType, entityId }: Props) {
  const { user, profile } = useAuth()
  const { t, lang } = useLangContext()
  const toast = useToast()
  const [rows, setRows] = useState<CommentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const onPickImage = (file: File | null) => {
    if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview)
    setPendingImage(file)
    setPendingImagePreview(file ? URL.createObjectURL(file) : null)
  }

  // Cleanup object URL when component unmounts.
  useEffect(() => () => {
    if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview)
  }, [pendingImagePreview])

  const formatWhen = (iso: string) => {
    const d = new Date(iso)
    const diff = (Date.now() - d.getTime()) / 1000
    if (diff < 60) return t.justNow
    if (diff < 3600) return t.minutesAgo(Math.floor(diff / 60))
    if (diff < 86400) return t.hoursAgo(Math.floor(diff / 3600))
    if (diff < 7 * 86400) return t.daysAgo(Math.floor(diff / 86400))
    return d.toLocaleDateString()
  }

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('comments')
      .select('id, user_id, entity_type, entity_id, parent_id, body, image_url, is_deleted, created_at')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: true })
      .limit(500)

    if (error || !data) {
      if (error) console.warn('[comments] load failed', error.message)
      setRows([])
      setLoading(false)
      return
    }

    const comments = data as CommentRecord[]
    const userIds = Array.from(new Set(comments.map((item) => item.user_id).filter(Boolean)))

    let authorMap = new Map<string, AuthorProfile>()
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, username')
        .in('id', userIds)

      if (profilesError) {
        console.warn('[comments] profile lookup failed', profilesError.message)
      } else {
        authorMap = new Map(
          (profiles ?? []).map((item) => [
            item.id as string,
            {
              display_name: item.display_name as string | null,
              avatar_url: item.avatar_url as string | null,
              username: item.username as string | null,
            },
          ]),
        )
      }
    }

    setRows(
      comments.map((item) => ({
        ...item,
        author: authorMap.get(item.user_id) ?? null,
      })),
    )
    setLoading(false)
  }, [entityId, entityType])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!isSupabaseConfigured) return

    const channel = supabase
      .channel(`comments-${entityType}-${entityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `entity_id=eq.${entityId}`,
        },
        () => {
          void load()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [entityId, entityType, load])

  const tree = useMemo(() => {
    const byParent = new Map<string | null, CommentRow[]>()
    rows.forEach((row) => {
      const key = row.parent_id
      const list = byParent.get(key) ?? []
      list.push(row)
      byParent.set(key, list)
    })
    return byParent
  }, [rows])

  const submit = async (text: string, parent: string | null = null, attachImage = false) => {
    if (!user) {
      setAuthOpen(true)
      return
    }

    const trimmed = text.trim()
    if (!trimmed && !(attachImage && pendingImage)) return

    setSubmitting(true)

    let imageUrl: string | null = null
    if (attachImage && pendingImage) {
      const ext = pendingImage.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png'
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const upload = await supabase.storage
        .from('comment-images')
        .upload(path, pendingImage, {
          cacheControl: '3600',
          contentType: pendingImage.type || `image/${ext}`,
          upsert: false,
        })
      if (upload.error) {
        setSubmitting(false)
        toast.error(
          lang === 'vi' ? 'Tải ảnh thất bại' : 'Image upload failed',
          upload.error.message,
        )
        return
      }
      imageUrl = supabase.storage.from('comment-images').getPublicUrl(path).data.publicUrl
    }

    const { error } = await supabase.from('comments').insert({
      user_id: user.id,
      entity_type: entityType,
      entity_id: entityId,
      parent_id: parent,
      body: trimmed.slice(0, 2000),
      image_url: imageUrl,
    })
    setSubmitting(false)

    if (error) {
      toast.error(
        lang === 'vi' ? 'Đăng bình luận thất bại' : 'Failed to post comment',
        error.message,
      )
      return
    }

    if (parent) {
      setReplyTo(null)
      setReplyBody('')
      toast.success(lang === 'vi' ? 'Đã đăng phản hồi' : 'Reply posted')
    } else {
      setBody('')
      onPickImage(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      toast.success(lang === 'vi' ? 'Đã đăng bình luận' : 'Comment posted')
    }
    void load()
  }

  const remove = async (id: string) => {
    if (!user) return
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) {
      toast.error(
        lang === 'vi' ? 'Xóa bình luận thất bại' : 'Failed to delete comment',
        error.message,
      )
      return
    }
    toast.info(lang === 'vi' ? 'Đã xóa bình luận' : 'Comment deleted')
    void load()
  }

  const renderNode = (node: CommentRow, depth = 0) => {
    const children = tree.get(node.id) ?? []
    const authorName = node.author?.display_name || node.author?.username || t.anonymous
    const avatar = node.author?.avatar_url
    const isOwn = user?.id === node.user_id

    return (
      <div
        key={node.id}
        className={`group/comment animate-[fadeIn_0.25s_ease-out] ${
          depth > 0 ? 'relative ml-5 pl-4 before:absolute before:left-0 before:top-0 before:h-full before:w-px before:bg-gradient-to-b before:from-gray-700 before:via-gray-800 before:to-transparent' : ''
        }`}
      >
        <div
          className={`flex gap-3 rounded-xl border border-transparent p-3 transition-all duration-200 hover:border-gray-800 hover:bg-white/[0.02] ${
            isOwn ? 'border-primary/10 bg-primary/[0.04]' : ''
          }`}
        >
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-1 ring-gray-800 transition-transform duration-200 group-hover/comment:ring-primary/40"
            />
          ) : (
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-500 text-xs font-bold text-white shadow ring-1 ring-primary/40">
              {authorName[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-gray-400">
              <span className="font-semibold text-gray-100">{authorName}</span>
              {isOwn && (
                <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  you
                </span>
              )}
              <span aria-hidden>·</span>
              <span>{formatWhen(node.created_at)}</span>
            </div>
            <p className="mt-1.5 whitespace-pre-line break-words text-[15px] leading-relaxed text-gray-100 sm:text-base">
              {node.body}
            </p>
            {node.image_url && (
              <a
                href={node.image_url}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-block overflow-hidden rounded-lg border border-gray-700"
              >
                <img
                  src={node.image_url}
                  alt="comment attachment"
                  className="max-h-80 max-w-full object-contain"
                  loading="lazy"
                />
              </a>
            )}
            <div className="mt-2 flex items-center gap-4 text-sm opacity-80 transition-opacity duration-200 group-hover/comment:opacity-100">
              {user && (
                <button
                  onClick={() => {
                    setReplyTo(node.id === replyTo ? null : node.id)
                    setReplyBody('')
                  }}
                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors ${
                    replyTo === node.id
                      ? 'bg-primary/15 text-primary'
                      : 'text-gray-400 hover:bg-white/5 hover:text-primary'
                  }`}
                >
                  <ReplyIcon className="h-3.5 w-3.5" />
                  {t.reply}
                </button>
              )}
              {isOwn && (
                <button
                  onClick={() => remove(node.id)}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" /> {t.delete}
                </button>
              )}
            </div>
            <div
              className={`grid overflow-hidden transition-[grid-template-rows,margin] duration-300 ease-out ${
                replyTo === node.id ? 'mt-3 grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="min-h-0">
                <div className="flex gap-2">
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder={t.replyPlaceholder}
                    rows={2}
                    autoFocus={replyTo === node.id}
                    className="flex-1 resize-none rounded-lg border border-gray-700 bg-background px-3 py-2.5 text-[15px] text-white placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <button
                    onClick={() => void submit(replyBody, node.id)}
                    disabled={submitting || !replyBody.trim()}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center self-start rounded-lg bg-primary text-white transition-all hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {children.length > 0 && (
          <div className="mt-1 space-y-1">
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const topLevel = tree.get(null) ?? []

  if (!isSupabaseConfigured) {
    return (
      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-white">
          <MessageSquare className="h-6 w-6 text-primary" /> {t.comments}
        </h2>
        <div className="rounded-xl border border-gray-800 bg-card p-6 text-sm text-gray-400">
          {t.commentsDisabled}
        </div>
      </section>
    )
  }

  return (
    <section className="mb-10">
      <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-white">
        <MessageSquare className="h-6 w-6 text-primary" /> {t.comments}
        <span className="inline-flex items-center rounded-full bg-primary/15 px-2.5 py-0.5 text-sm font-medium text-primary">
          {rows.length}
        </span>
      </h2>

      <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-b from-card to-card/60 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]">
        {/* Composer */}
        <div className="border-b border-gray-800/80 bg-white/[0.015] p-4">
          {user ? (
            <div className="flex gap-3">
              {profile?.avatar_url || user.user_metadata?.avatar_url ? (
                <img
                  src={profile?.avatar_url || user.user_metadata?.avatar_url}
                  alt=""
                  className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-1 ring-gray-700"
                />
              ) : (
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-500 text-sm font-bold text-white shadow">
                  {(profile?.display_name || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={t.commentPlaceholder}
                  rows={3}
                  maxLength={2000}
                  className="w-full resize-none rounded-lg border border-gray-700 bg-background px-3 py-2.5 text-[15px] leading-relaxed text-white placeholder-gray-500 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-base"
                />
                {pendingImagePreview && (
                  <div className="relative mt-2 inline-block">
                    <img
                      src={pendingImagePreview}
                      alt="preview"
                      className="max-h-40 rounded-lg border border-gray-700"
                    />
                    <button
                      type="button"
                      onClick={() => onPickImage(null)}
                      className="absolute -right-2 -top-2 rounded-full bg-black/80 p-1 text-gray-200 hover:text-white"
                      aria-label="Remove image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs transition-colors ${
                        body.length > 1800 ? 'text-amber-400' : 'text-gray-500'
                      }`}
                    >
                      {body.length}/2000
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-700 px-2 py-1 text-xs text-gray-300 hover:border-primary hover:text-primary"
                      title={lang === 'vi' ? 'Đính kèm ảnh' : 'Attach image'}
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      {lang === 'vi' ? 'Ảnh' : 'Image'}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null
                        if (file && file.size > 5 * 1024 * 1024) {
                          toast.error(lang === 'vi' ? 'Ảnh tối đa 5MB' : 'Max image size is 5MB')
                          e.target.value = ''
                          return
                        }
                        onPickImage(file)
                      }}
                    />
                  </div>
                  <button
                    onClick={() => void submit(body, null, true)}
                    disabled={submitting || (!body.trim() && !pendingImage)}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {t.post}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-gray-700 bg-background/60 px-4 py-3">
              <span className="text-sm text-gray-400">{t.signInToComment}</span>
              <button
                onClick={() => setAuthOpen(true)}
                className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/20"
              >
                {t.signIn}
              </button>
            </div>
          )}
        </div>

        {/* Thread */}
        <div className="divide-y divide-gray-800/60 p-2">
          {loading ? (
            <div className="space-y-3 p-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex animate-pulse gap-3 rounded-xl border border-gray-800/60 p-3"
                >
                  <div className="h-9 w-9 rounded-full bg-gray-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 rounded bg-gray-800" />
                    <div className="h-3 w-full rounded bg-gray-800" />
                    <div className="h-3 w-2/3 rounded bg-gray-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : topLevel.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <MessageSquare className="h-8 w-8 text-gray-700" />
              <p className="text-sm text-gray-500">{t.noComments}</p>
            </div>
          ) : (
            <div className="space-y-1 py-1">
              {topLevel.map((comment) => renderNode(comment))}
            </div>
          )}
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </section>
  )
}
