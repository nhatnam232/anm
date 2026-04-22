import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    hcaptcha?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          theme?: 'light' | 'dark'
          callback?: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
        },
      ) => string | number
      reset: (widgetId?: string | number) => void
    }
  }
}

const SCRIPT_ID = 'hcaptcha-api-script'

type Props = {
  siteKey: string
  onVerify: (token: string | null) => void
  resetSignal?: number
}

export default function HCaptchaWidget({ siteKey, onVerify, resetSignal = 0 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | number | null>(null)
  const [ready, setReady] = useState(Boolean(window.hcaptcha))

  useEffect(() => {
    if (window.hcaptcha) {
      setReady(true)
      return
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      const handleLoad = () => setReady(true)
      existing.addEventListener('load', handleLoad)
      return () => existing.removeEventListener('load', handleLoad)
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => setReady(true)
    document.body.appendChild(script)

    return () => {
      script.onload = null
    }
  }, [])

  useEffect(() => {
    if (!ready || !window.hcaptcha || !containerRef.current || widgetIdRef.current !== null) return

    widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
      sitekey: siteKey,
      theme: 'dark',
      callback: (token) => onVerify(token),
      'expired-callback': () => onVerify(null),
      'error-callback': () => onVerify(null),
    })
  }, [onVerify, ready, siteKey])

  useEffect(() => {
    if (!window.hcaptcha || widgetIdRef.current === null) return
    window.hcaptcha.reset(widgetIdRef.current)
    onVerify(null)
  }, [onVerify, resetSignal])

  return <div ref={containerRef} className="flex justify-center" />
}
