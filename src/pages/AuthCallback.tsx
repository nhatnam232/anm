import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useLangContext } from '@/providers/LangProvider'

export default function AuthCallback() {
  const { t } = useLangContext()
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(() => {
      if (!cancelled) navigate('/', { replace: true })
    })
    return () => {
      cancelled = true
    }
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-gray-300">
      {t.authSigningIn}
    </div>
  )
}
