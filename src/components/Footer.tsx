import {
  BookOpen,
  Calendar,
  Compass,
  Heart,
  Home,
  Search,
  Shield,
  Star,
  Trophy,
} from 'lucide-react'
import Logo from './Logo'
import ReloadLink from '@/components/ReloadLink'
import { useLangContext } from '@/providers/LangProvider'

/**
 * Site footer with grouped navigation columns. Each link gets its own icon so
 * the layout stops looking like a wall of plain text + a single logo.
 */
export default function Footer() {
  const { t, lang } = useLangContext()

  const sections: Array<{
    title: string
    icon: React.ComponentType<{ className?: string }>
    links: Array<{ to: string; label: string; icon: React.ComponentType<{ className?: string }> }>
  }> = [
    {
      title: lang === 'vi' ? 'Khám phá' : 'Discover',
      icon: Compass,
      links: [
        { to: '/', label: t.home, icon: Home },
        { to: '/search', label: t.browse, icon: Search },
        { to: '/season', label: t.seasonNav, icon: Star },
      ],
    },
    {
      title: lang === 'vi' ? 'Cộng đồng' : 'Community',
      icon: Heart,
      links: [
        { to: '/ranking', label: t.rankingNav, icon: Trophy },
        { to: '/schedule', label: t.scheduleNav, icon: Calendar },
        { to: '/library', label: t.libraryNav, icon: BookOpen },
      ],
    },
    {
      title: lang === 'vi' ? 'Pháp lý' : 'Legal',
      icon: Shield,
      links: [{ to: '/tos', label: lang === 'vi' ? 'Điều khoản' : 'Terms of Service', icon: Shield }],
    },
  ]

  return (
    <footer className="mt-auto border-t border-border bg-card py-12">
      <div className="container mx-auto px-4">
        {/* Brand block */}
        <div className="mb-10 flex flex-col items-center text-center">
          <Logo size={48} />
          <p className="mt-4 max-w-md text-sm text-text-muted">{t.footerTagline}</p>
        </div>

        {/* Link grid */}
        <div className="grid grid-cols-1 gap-8 border-t border-border pt-8 sm:grid-cols-3">
          {sections.map((section) => {
            const SectionIcon = section.icon
            return (
              <div key={section.title}>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <SectionIcon className="h-3.5 w-3.5" />
                  </span>
                  {section.title}
                </h3>
                <ul className="space-y-2">
                  {section.links.map((link) => {
                    const LinkIcon = link.icon
                    return (
                      <li key={link.to}>
                        <ReloadLink
                          to={link.to}
                          className="group inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-primary"
                        >
                          <LinkIcon className="h-3.5 w-3.5 text-text-muted/70 transition-colors group-hover:text-primary" />
                          {link.label}
                        </ReloadLink>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>

        {/* Copyright */}
        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-text-muted">
          <div className="mb-2 flex items-center justify-center gap-1.5 text-text-muted/80">
            <Logo size={20} showWordmark={false} />
            <span>Anime Wiki</span>
          </div>
          &copy; {new Date().getFullYear()} Anime Wiki. {t.unofficialIndex}
        </div>
      </div>
    </footer>
  )
}
