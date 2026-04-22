import { ChevronRight, Home } from 'lucide-react'
import ReloadLink from '@/components/ReloadLink'
import { useLangContext } from '@/providers/LangProvider'

interface Crumb {
  name: string;
  path?: string;
}

interface BreadcrumbsProps {
  crumbs: Crumb[];
}

export default function Breadcrumbs({ crumbs }: BreadcrumbsProps) {
  const { t } = useLangContext()

  return (
    <nav className="flex items-center text-sm text-gray-400 py-4 mb-4 overflow-x-auto whitespace-nowrap">
      <ReloadLink to="/" className="flex items-center hover:text-white transition-colors">
        <Home className="w-4 h-4 mr-1" />
        <span>{t.home}</span>
      </ReloadLink>
      
      {crumbs.map((crumb, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight className="w-4 h-4 mx-2 text-gray-600 flex-shrink-0" />
          {crumb.path ? (
            <ReloadLink to={crumb.path} className="hover:text-white transition-colors truncate">
              {crumb.name}
            </ReloadLink>
          ) : (
            <span className="text-gray-200 font-medium truncate">{crumb.name}</span>
          )}
        </div>
      ))}
    </nav>
  )
}
