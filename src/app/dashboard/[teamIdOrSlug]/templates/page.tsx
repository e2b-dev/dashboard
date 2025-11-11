import TemplatesTable from '@/features/dashboard/templates/table'
import {
  getDefaultTemplates,
  getTeamTemplates,
} from '@/server/templates/get-team-templates'
import ErrorBoundary from '@/ui/error'

export default async function Page({
  params,
}: PageProps<'/dashboard/[teamIdOrSlug]/templates'>) {
  const { teamIdOrSlug } = await params

  const res = await getTeamTemplates({
    teamIdOrSlug,
  })

  const defaultRes = await getDefaultTemplates()

  if (!res?.data?.templates || res?.serverError) {
    return (
      <ErrorBoundary
        error={
          {
            name: 'Templates Error',
            message: res?.serverError ?? 'Unknown error',
          } satisfies Error
        }
        description={'Could not load templates'}
      />
    )
  }

  const templates = [
    ...res.data.templates,
    ...(defaultRes?.data?.templates ? defaultRes.data.templates : []),
  ]

  return <TemplatesTable templates={templates} />
}
