import TemplatesTable from '@/features/dashboard/templates/table'
import {
  getDefaultTemplates,
  getTeamTemplates,
} from '@/server/templates/get-team-templates'
import ErrorBoundary from '@/ui/error'

interface PageProps {
  params: Promise<{
    teamIdOrSlug: string
  }>
}

export default function Page({ params }: PageProps) {
  return (
    <div className="flex flex-1 flex-col">
      <PageContent params={params} />
    </div>
  )
}

interface PageContentProps {
  params: Promise<{
    teamIdOrSlug: string
  }>
}

async function PageContent({ params }: PageContentProps) {
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
