import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

type Props = {
  children: ReactNode
}

type State = {
  error: Error | null
}

/**
 * Top-level render error boundary.
 *
 * Distinct from LazyChunkErrorBoundary, which only handles the
 * "failed to fetch dynamically imported module" case after a deploy. This one
 * catches ordinary render throws — the realistic failure mode here is AniList
 * returning a record with a field we assumed was always present (exactly the
 * `genres` crash fixed in a5e0437). Before this, that threw during render,
 * React unmounted the whole tree, and the user got a white page with no way
 * out except a manual refresh.
 *
 * Intentionally does NOT use useLangContext: the provider sits above this
 * boundary, but if the crash happened *because* of a provider we still need to
 * render something, so the copy is bilingual and dependency-free.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the component stack — the message alone rarely identifies which
    // card in a grid of 50 threw.
    console.error('[ErrorBoundary] render error:', error, info.componentStack)
  }

  private handleRetry = () => {
    // Clearing the error re-renders the same subtree. That is enough for a
    // transient bad API response, since react-query will refetch.
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-400" />

        <div>
          <h1 className="text-xl font-bold text-text">Đã xảy ra lỗi</h1>
          <p className="mt-1 text-sm text-text-muted">Something went wrong while rendering this page.</p>
        </div>

        {/* The message is shown because this is a hobby-scale site with no
            error reporting wired up — without it a bug report is just
            "it broke". */}
        <code className="max-w-lg overflow-x-auto rounded-lg border border-border bg-card/60 px-3 py-2 text-left text-xs text-text-muted">
          {error.message || String(error)}
        </code>

        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover keep-white-on-light"
          >
            <RefreshCw className="h-4 w-4" />
            Thử lại · Retry
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-text transition-colors hover:border-primary/60"
          >
            <Home className="h-4 w-4" />
            Trang chủ · Home
          </a>
        </div>
      </div>
    )
  }
}
