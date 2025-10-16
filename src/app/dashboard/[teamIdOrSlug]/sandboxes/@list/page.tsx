import SandboxesTable from '@/features/dashboard/sandboxes/list/table'
import { getTeamSandboxes } from '@/server/sandboxes/get-team-sandboxes'
import { getTeamSandboxesMetrics } from '@/server/sandboxes/get-team-sandboxes-metrics'
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

export default async function Page({ params }: PageProps) {
  return (
    <div className="flex flex-1 flex-col md:overflow-hidden">
      <PageContent params={params} />
    </div>
  )
}

async function PageContent({ params }: PageProps) {
  const { teamIdOrSlug } = await params

  const [sandboxesRes, templatesRes, defaultTemplateRes] = await Promise.all([
    getTeamSandboxes({ teamIdOrSlug }),
    getTeamTemplates({ teamIdOrSlug }),
    getDefaultTemplates(),
  ])

  if (
    !sandboxesRes?.data ||
    sandboxesRes?.serverError ||
    !templatesRes?.data?.templates ||
    templatesRes?.serverError
  ) {
    return (
      <ErrorBoundary
        error={
          {
            name: 'Sandboxes Error',
            message:
              sandboxesRes?.serverError ??
              templatesRes?.serverError ??
              'Unknown error',
          } satisfies Error
        }
        description="Could not load sandboxes"
      />
    )
  }

  const maxSandboxesToFetchInitially = 100

  const metricsRes = await getTeamSandboxesMetrics({
    teamIdOrSlug,
    sandboxIds: sandboxesRes.data.sandboxes
      .map((sandbox) => sandbox.sandboxID)
      .slice(0, maxSandboxesToFetchInitially),
  })

  const sandboxes = sandboxesRes.data.sandboxes
  const templates = [
    ...(defaultTemplateRes?.data?.templates
      ? defaultTemplateRes.data.templates
      : []),
    ...templatesRes.data.templates,
  ]

  return (
    <div className="flex flex-col h-full relative min-h-0 md:overflow-hidden">
      <SandboxesTable
        templates={templates}
        initialSandboxes={sandboxes}
        initialMetrics={metricsRes?.data?.metrics || null}
      />
    </div>
  )
}
