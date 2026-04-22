import { useCallback, useEffect, useState } from 'react'
import {
  BadgeCheck,
  BookOpen,
  Camera,
  Heart,
  Library,
  Loader2,
  Mail,
  Save,
  Sparkles,
  Star,
  UserRound,
} from 'lucide-react'
import Layout from '@/components/Layout'
import AuthModal from '@/components/AuthModal'
import ReloadLink from '@/components/ReloadLink'
import { useAuth } from '@/providers/AuthProvider'
import { useLangContext } from '@/providers/LangProvider'
import { useToast } from '@/providers/ToastProvider'
import { useFavoritesStore } from '@/store/useFavoritesStore'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

type ServerFavorite = {
  anime_id: number
  anime_title: string | null
  anime_cover: string | null
  created_at: string
}

type LibraryHistoryEntry = {
  anime_id: number
  anime_title: string
  anime_cover: string | null
  status: string
  current_episode: number
  anime_episodes: number | null
  score: number | null
  updated_at: string
}

export default function Profile() {
  const { t, lang } = useLangContext()
  const { user, profile, loading, configured, updateProfile, uploadAvatar, refreshProfile } =
    useAuth()
  const toast = useToast()
  const favorites = useFavoritesStore((state) => state.favorites)
  const [authOpen, setAuthOpen] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'favorites' | 'library'>('favorites')
  const [serverFavorites, setServerFavorites] = useState<ServerFavorite[]>([])
  const [libraryHistory, setLibraryHistory] = useState<LibraryHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const loadHistory = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return
    setHistoryLoading(true)
    const [{ data: favData }, { data: libData }] = await Promise.all([
      supabase
        .from('favorites')
        .select('anime_id, anime_title, anime_cover, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(60),
      supabase
        .from('user_library')
        .select('anime_id, anime_title, anime_cover, status, current_episode, anime_episodes, score, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(30),
    ])
    setServerFavorites((favData as ServerFavorite[]) ?? [])
    setLibraryHistory((libData as LibraryHistoryEntry[]) ?? [])
    setHistoryLoading(false)
  }, [user])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  useEffect(() => {
    void refreshProfile()
  }, [refreshProfile])

  useEffect(() => {
    setDisplayName(profile?.display_name || user?.user_metadata?.full_name || '')
    setUsername(profile?.username || '')
  }, [profile, user?.user_metadata?.full_name])

  const avatar = profile?.avatar_url || user?.user_metadata?.avatar_url || null
  const profileFields = [
    Boolean(displayName.trim()),
    Boolean(username.trim()),
    Boolean(avatar),
    Boolean(user?.email),
  ]
  const completion = Math.round(
    (profileFields.filter(Boolean).length / profileFields.length) * 100,
  )

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)

    const res = await updateProfile({
      display_name: displayName.trim() || null,
      username: username.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_') || null,
    })

    setSaving(false)
    if (res.error) {
      setError(res.error)
      toast.error(lang === 'vi' ? 'Lưu hồ sơ thất bại' : 'Save failed', res.error)
      return
    }

    setMessage(t.profileUpdated)
    toast.success(t.profileUpdated)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    setMessage(null)
    const res = await uploadAvatar(file)
    setUploading(false)

    if (res.error) {
      setError(res.error)
      toast.error(
        lang === 'vi' ? 'Tải ảnh đại diện thất bại' : 'Avatar upload failed',
        res.error,
      )
      return
    }

    setMessage(t.avatarUpdated)
    toast.success(t.avatarUpdated)
    e.target.value = ''
  }

  if (!configured) {
    return (
      <Layout>
        <div className="container mx-auto max-w-3xl px-4 py-16">
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6 text-yellow-100">
            {t.profileUnavailable}
          </div>
        </div>
      </Layout>
    )
  }

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto max-w-4xl px-4 py-16">
          <div className="animate-pulse rounded-3xl border border-gray-800 bg-card p-8">
            <div className="mb-6 h-20 w-20 rounded-full bg-gray-800" />
            <div className="mb-4 h-8 w-48 rounded bg-gray-800" />
            <div className="h-28 rounded bg-gray-800" />
          </div>
        </div>
      </Layout>
    )
  }

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto max-w-3xl px-4 py-16">
          <div className="rounded-3xl border border-gray-800 bg-card p-8 text-center">
            <UserRound className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h1 className="text-3xl font-bold text-white">{t.yourProfile}</h1>
            <p className="mt-3 text-gray-400">{t.profileSubtitle}</p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => setAuthOpen(true)}
                className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              >
                {t.signIn}
              </button>
              <ReloadLink
                to="/"
                className="rounded-full border border-gray-700 px-5 py-2 text-sm text-gray-200 hover:border-primary"
              >
                {t.backHome}
              </ReloadLink>
            </div>
          </div>
          <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(15,23,42,0.96)_40%,rgba(16,185,129,0.12))] p-6 shadow-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-4">
              {avatar ? (
                <img
                  src={avatar}
                  alt=""
                  className="h-20 w-20 rounded-3xl border border-white/10 object-cover shadow-lg"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-3xl font-bold text-white shadow-lg">
                  {(displayName || user.email || 'U')[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-sky-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t.profileOverview}
                </div>
                <h1 className="text-3xl font-bold text-white">
                  {profile?.display_name || user.user_metadata?.full_name || user.email}
                </h1>
                <p className="mt-1 text-sm text-slate-300">{t.publicPresence}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t.favoriteLibrary}</div>
                <div className="mt-1 text-2xl font-bold text-white">{favorites.length}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t.profileCompletion}</div>
                <div className="mt-1 text-2xl font-bold text-white">{completion}%</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t.accountStatus}</div>
                <div className="mt-1 inline-flex items-center gap-2 text-lg font-semibold text-emerald-300">
                  <BadgeCheck className="h-5 w-5" />
                  {t.accountStatusActive}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="surface-float rounded-3xl border border-gray-800 bg-card p-6">
            <div className="flex flex-col items-center text-center">
              {avatar ? (
                <img
                  src={avatar}
                  alt=""
                  className="h-28 w-28 rounded-full border border-gray-700 object-cover"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary text-4xl font-bold text-white">
                  {(displayName || user.email || 'U')[0]?.toUpperCase()}
                </div>
              )}

              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-700 px-4 py-2 text-sm text-gray-200 transition-colors hover:border-primary">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                {t.changeAvatar}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>

              <p className="mt-3 text-xs text-gray-500">{t.recentAvatarTip}</p>

              <h2 className="mt-5 text-2xl font-bold text-white">
                {profile?.display_name || user.user_metadata?.full_name || user.email}
              </h2>
              <p className="mt-1 text-sm text-gray-400">@{profile?.username || 'user'}</p>
            </div>

            <div className="mt-6 space-y-4 border-t border-gray-800 pt-6 text-sm">
              <div>
                <div className="text-gray-500">{t.email}</div>
                <div className="mt-1 flex items-center gap-2 text-gray-200">
                  <Mail className="h-4 w-4 text-primary" />
                  <span>{user.email}</span>
                </div>
              </div>
              <div>
                <div className="text-gray-500">{t.joined}</div>
                <div className="mt-1 text-gray-200">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : t.unknown}
                </div>
              </div>
              <div>
                <div className="text-gray-500">{t.favoriteLibrary}</div>
                <div className="mt-1 flex items-center gap-2 text-gray-200">
                  <Heart className="h-4 w-4 text-red-400" />
                  <span>{favorites.length}</span>
                </div>
              </div>
              <div>
                <div className="text-gray-500">{t.memberIdentity}</div>
                <div className="mt-1 text-gray-200">{profile?.username || t.unknown}</div>
              </div>
            </div>
          </aside>

          <section className="surface-float rounded-3xl border border-gray-800 bg-card p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">{t.editProfile}</h2>
              <p className="mt-2 text-sm text-gray-400">{t.updateProfileHint}</p>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm text-gray-300">{t.displayName}</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={80}
                  className="w-full rounded-xl border border-gray-700 bg-background px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">{t.username}</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={30}
                  className="w-full rounded-xl border border-gray-700 bg-background px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
                />
                <p className="mt-2 text-xs text-gray-500">{t.usernameHint}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-gray-800 bg-background/60 p-4">
                  <div className="text-sm font-medium text-white">{t.profileCompletion}</div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{completion}%</p>
                </div>
                <div className="rounded-2xl border border-gray-800 bg-background/60 p-4">
                  <div className="text-sm font-medium text-white">{t.favoriteLibrary}</div>
                  <p className="mt-2 text-2xl font-bold text-white">{favorites.length}</p>
                  <p className="mt-1 text-xs text-gray-500">{t.publicPresence}</p>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t.saveChanges}
              </button>
            </form>
          </section>
        </div>

        {/* History: favorites & library */}
        <section className="surface-float mt-8 rounded-3xl border border-gray-800 bg-card p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {lang === 'vi' ? 'Lịch sử hoạt động' : 'Activity history'}
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                {lang === 'vi'
                  ? 'Các anime bạn đã yêu thích và trạng thái theo dõi gần đây'
                  : 'Anime you favorited and recent library status changes'}
              </p>
            </div>
            <div className="flex gap-1 rounded-xl border border-gray-800 bg-background p-1">
              <button
                onClick={() => setActiveTab('favorites')}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  activeTab === 'favorites'
                    ? 'bg-primary text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Heart className="h-4 w-4" />
                {lang === 'vi' ? 'Yêu thích' : 'Favorites'}
                <span className="rounded-full bg-white/15 px-1.5 text-xs">
                  {serverFavorites.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('library')}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  activeTab === 'library'
                    ? 'bg-primary text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Library className="h-4 w-4" />
                {lang === 'vi' ? 'Thư viện' : 'Library'}
                <span className="rounded-full bg-white/15 px-1.5 text-xs">
                  {libraryHistory.length}
                </span>
              </button>
            </div>
          </div>

          {historyLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] animate-pulse rounded-xl border border-gray-800 bg-background/60"
                />
              ))}
            </div>
          ) : activeTab === 'favorites' ? (
            serverFavorites.length === 0 ? (
              <EmptyHistory
                icon={<Heart className="h-10 w-10 text-gray-700" />}
                title={lang === 'vi' ? 'Chưa có anime yêu thích' : 'No favorites yet'}
                hint={
                  lang === 'vi'
                    ? 'Nhấn nút ❤️ trên trang anime để lưu lại'
                    : 'Tap the ❤️ button on any anime page to save it here'
                }
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {serverFavorites.map((fav) => (
                  <ReloadLink
                    key={fav.anime_id}
                    to={`/anime/${fav.anime_id}`}
                    className="group overflow-hidden rounded-xl border border-gray-800 bg-background/50 transition-all hover:-translate-y-0.5 hover:border-primary/50"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden">
                      {fav.anime_cover ? (
                        <img
                          src={fav.anime_cover}
                          alt={fav.anime_title ?? ''}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.visibility = 'hidden'
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-700">
                          <Heart className="h-8 w-8" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2">
                        <p className="line-clamp-2 text-xs font-semibold text-white">
                          {fav.anime_title ?? 'Untitled'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-2 py-1.5 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3 text-red-400" />
                        {new Date(fav.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </ReloadLink>
                ))}
              </div>
            )
          ) : libraryHistory.length === 0 ? (
            <EmptyHistory
              icon={<BookOpen className="h-10 w-10 text-gray-700" />}
              title={lang === 'vi' ? 'Thư viện trống' : 'Library is empty'}
              hint={
                lang === 'vi'
                  ? 'Thêm anime vào thư viện từ trang chi tiết'
                  : 'Add anime to your library from any anime page'
              }
            />
          ) : (
            <div className="space-y-2">
              {libraryHistory.map((entry) => (
                <ReloadLink
                  key={entry.anime_id}
                  to={`/anime/${entry.anime_id}`}
                  className="flex items-center gap-3 rounded-xl border border-gray-800 bg-background/50 p-2.5 transition-all hover:border-primary/40"
                >
                  {entry.anime_cover ? (
                    <img
                      src={entry.anime_cover}
                      alt=""
                      className="h-14 w-10 flex-shrink-0 rounded-md object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-14 w-10 flex-shrink-0 items-center justify-center rounded-md bg-gray-800 text-gray-600">
                      <BookOpen className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-white">
                      {entry.anime_title}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">
                        {entry.status.replace('_', ' ')}
                      </span>
                      {entry.anime_episodes ? (
                        <span>
                          {entry.current_episode}/{entry.anime_episodes} eps
                        </span>
                      ) : (
                        <span>{entry.current_episode} eps</span>
                      )}
                      {entry.score !== null && (
                        <span className="flex items-center gap-0.5 text-yellow-400">
                          <Star className="h-3 w-3 fill-current" />
                          {entry.score}/10
                        </span>
                      )}
                      <span className="ml-auto text-gray-500">
                        {new Date(entry.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </ReloadLink>
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}

function EmptyHistory({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode
  title: string
  hint: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      {icon}
      <p className="text-sm font-semibold text-gray-200">{title}</p>
      <p className="text-xs text-gray-500">{hint}</p>
    </div>
  )
}
