import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export type Profile = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

type AuthContextValue = {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  configured: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (
    email: string,
    password: string,
    captchaToken?: string,
  ) => Promise<{ error?: string }>
  signUpWithEmail: (
    email: string,
    password: string,
    displayName?: string,
    captchaToken?: string,
  ) => Promise<{ error?: string; needsConfirmation?: boolean }>
  refreshProfile: () => Promise<void>
  updateProfile: (updates: {
    username?: string | null
    display_name?: string | null
    avatar_url?: string | null
  }) => Promise<{ error?: string }>
  uploadAvatar: (file: File) => Promise<{ error?: string; url?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.warn('[auth] fetchProfile failed', error.message)
    return null
  }
  return (data as Profile) ?? null
}

async function ensureProfileRow(user: User) {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      display_name:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'User',
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      username: user.email?.split('@')[0] || null,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  )

  if (error) {
    console.warn('[auth] ensureProfileRow failed', error.message)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    const currentUser = session?.user
    if (!currentUser) {
      setProfile(null)
      return
    }

    await ensureProfileRow(currentUser)
    const nextProfile = await fetchProfile(currentUser.id)
    setProfile(nextProfile)
  }, [session?.user])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    let cancelled = false

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return

      setSession(data.session)

      if (data.session?.user) {
        await ensureProfileRow(data.session.user)
        const nextProfile = await fetchProfile(data.session.user.id)
        if (!cancelled) setProfile(nextProfile)
      }

      if (!cancelled) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)

      if (next?.user) {
        void ensureProfileRow(next.user)
          .then(() => fetchProfile(next.user.id))
          .then((nextProfile) => setProfile(nextProfile))
      } else {
        setProfile(null)
      }
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string, captchaToken?: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    })
    return { error: error?.message }
  }, [])

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName?: string, captchaToken?: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          captchaToken,
          data: displayName ? { full_name: displayName } : undefined,
        },
      })

      if (error) return { error: error.message }
      return { needsConfirmation: !data.session }
    },
    [],
  )

  const updateProfile = useCallback(
    async (updates: { username?: string | null; display_name?: string | null; avatar_url?: string | null }) => {
      const currentUser = session?.user
      if (!currentUser) return { error: 'You need to sign in first.' }

      // Use upsert so we also create the row if handle_new_user trigger hasn't run yet.
      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: currentUser.id,
            ...updates,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' },
        )

      if (error) return { error: error.message }

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: updates.display_name ?? profile?.display_name ?? undefined,
          avatar_url: updates.avatar_url ?? profile?.avatar_url ?? undefined,
        },
      })

      if (authError) {
        console.warn('[auth] updateUser metadata failed', authError.message)
      }

      await refreshProfile()
      return {}
    },
    [profile?.avatar_url, profile?.display_name, refreshProfile, session?.user],
  )

  const uploadAvatar = useCallback(
    async (file: File) => {
      const currentUser = session?.user
      if (!currentUser) return { error: 'You need to sign in first.' }
      if (!file.type.startsWith('image/')) return { error: 'Please choose an image file.' }
      if (file.size > 2 * 1024 * 1024) return { error: 'Avatar must be 2 MB or smaller.' }

      const extension = file.name.split('.').pop()?.toLowerCase() || 'png'
      const safeExtension = extension.replace(/[^a-z0-9]/g, '') || 'png'
      // Keep path under the user's folder so the avatars_insert_own RLS policy allows it.
      const filePath = `${currentUser.id}/avatar-${Date.now()}.${safeExtension}`

      const { error } = await supabase.storage.from('avatars').upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || `image/${safeExtension}`,
      })

      if (error) return { error: error.message }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const url = data.publicUrl
      const updateResult = await updateProfile({ avatar_url: url })
      if (updateResult.error) return updateResult

      return { url }
    },
    [session?.user, updateProfile],
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      loading,
      configured: isSupabaseConfigured,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      refreshProfile,
      updateProfile,
      uploadAvatar,
      signOut,
    }),
    [
      loading,
      profile,
      refreshProfile,
      session,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      signUpWithEmail,
      updateProfile,
      uploadAvatar,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
