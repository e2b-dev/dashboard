import TemplatesTable from '@/features/dashboard/templates/table'
import { safeCall } from '@/lib/utils'
import { trpcCaller } from '@/trpc/server'
import ErrorBoundary from '@/ui/error'

export default async function Page({
  params,
}: PageProps<'/dashboard/[teamIdOrSlug]/templates'>) {
  const { teamIdOrSlug } = await params

  try {
    const res = await trpcCaller.templates.getTemplates({
      teamIdOrSlug,
    })

    const [_, defaultRes] = await safeCall(() =>
      trpcCaller.templates.getDefaultTemplatesCached()
    )

    const defaultTemplates = defaultRes?.templates ?? []

    const templates = [...res.templates, ...defaultTemplates]

    return <TemplatesTable templates={templates} />
  } catch (error) {
    return (
      <ErrorBoundary
        error={
          {
            name: 'Templates Error',
            message: error instanceof Error ? error.message : 'Unknown error',
          } satisfies Error
        }
        description={'Could not load templates'}
      />
    )
  }
}
