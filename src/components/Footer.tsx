import Logo from './Logo'
import ReloadLink from '@/components/ReloadLink'
import { useLangContext } from '@/providers/LangProvider'
import { Shield } from 'lucide-react'

export default function Footer() {
  const { t, lang } = useLangContext()

  return (
    <footer className="mt-auto border-t border-gray-800 bg-card py-12">
      <div className="container mx-auto px-4 text-center">
        <div className="mb-6 flex items-center justify-center">
          <Logo size={40} />
        </div>
        <p className="mx-auto mb-8 max-w-md text-gray-400">{t.footerTagline}</p>
        <div className="mb-8 flex flex-wrap justify-center gap-6 text-sm text-gray-500">
          <ReloadLink to="/" className="transition-colors hover:text-primary">
            {t.home}
          </ReloadLink>
          <ReloadLink to="/search" className="transition-colors hover:text-primary">
            {t.browse}
          </ReloadLink>
          <ReloadLink to="/ranking" className="transition-colors hover:text-primary">
            {lang === 'vi' ? 'Xếp hạng' : 'Ranking'}
          </ReloadLink>
          <ReloadLink to="/season" className="transition-colors hover:text-primary">
            {lang === 'vi' ? 'Theo mùa' : 'Seasonal'}
          </ReloadLink>
          <ReloadLink to="/schedule" className="transition-colors hover:text-primary">
            {lang === 'vi' ? 'Lịch chiếu' : 'Schedule'}
          </ReloadLink>
          <ReloadLink
            to="/tos"
            className="flex items-center gap-1 transition-colors hover:text-primary"
          >
            <Shield className="h-3.5 w-3.5" />
            {lang === 'vi' ? 'Điều khoản' : 'Terms of Service'}
          </ReloadLink>
        </div>
        <div className="text-sm text-gray-600">
          &copy; {new Date().getFullYear()} Anime Wiki. {t.unofficialIndex}
        </div>
      </div>
    </footer>
  )
}
