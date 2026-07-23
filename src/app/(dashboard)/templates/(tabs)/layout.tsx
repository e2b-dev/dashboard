import { PROTECTED_URLS } from '@/configs/urls'
import { DashboardTabsList } from '@/ui/dashboard-tabs'
import { BuildIcon, ListIcon } from '@/ui/primitives/icons'

export default async function TemplatesTabsLayout({
  children,
}: LayoutProps<'/templates'>) {
  return (
    <div className="pt-2 flex-1 md:pt-3 min-h-0 h-full flex flex-col">
      <DashboardTabsList
        layoutKey="tabs-indicator-templates"
        tabs={[
          {
            id: 'list',
            label: 'List',
            href: PROTECTED_URLS.TEMPLATES_LIST,
            icon: <ListIcon className="size-4" />,
          },
          {
            id: 'builds',
            label: 'Builds',
            href: PROTECTED_URLS.TEMPLATES_BUILDS,
            icon: <BuildIcon className="size-4" />,
          },
        ]}
      />
      {children}
    </div>
  )
}
