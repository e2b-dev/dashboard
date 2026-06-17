import { Suspense } from 'react'
import TemplateDetailTabs from '@/features/dashboard/templates/detail/tabs'
import TemplateTitleBinder from '@/features/dashboard/templates/detail/title-binder'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

export default async function TemplateDetailLayout({
  children,
  params,
}: LayoutProps<'/dashboard/[teamSlug]/templates/[templateId]'>) {
  const { teamSlug, templateId } = await params

  prefetch(trpc.templates.getTemplate.queryOptions({ teamSlug, templateId }))

  return (
    <HydrateClient>
      <div className="pt-2 flex-1 md:pt-3 min-h-0 h-full flex flex-col">
        <Suspense fallback={null}>
          <TemplateTitleBinder teamSlug={teamSlug} templateId={templateId} />
        </Suspense>
        <TemplateDetailTabs teamSlug={teamSlug} templateId={templateId} />
        {children}
      </div>
    </HydrateClient>
  )
}
