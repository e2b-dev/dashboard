import SandboxesTable from '@/features/dashboard/sandboxes/table'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
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
  const { teamIdOrSlug } = await params

  return <PageContent teamIdOrSlug={teamIdOrSlug} />
}

interface PageContentProps {
  teamIdOrSlug: string
}

async function PageContent({ teamIdOrSlug }: PageContentProps) {
  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  const [sandboxesRes, templatesRes, defaultTemplateRes] = await Promise.all([
    getTeamSandboxes({ teamId }),
    getTeamTemplates({ teamId }),
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
        description={'Could not load sandboxes'}
      />
    )
  }

  const maxSandboxesToFetchInitially = 100

  const metricsRes = await getTeamSandboxesMetrics({
    teamId,
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
    <SandboxesTable
      sandboxes={sandboxes}
      templates={templates}
      initialMetrics={metricsRes?.data?.metrics || null}
    />
  )
}
