import DashboardPageLayout from '@/features/dashboard/page-layout'
import TemplatesTable from '@/features/dashboard/templates/table'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import {
  getDefaultTemplates,
  getTeamTemplates,
} from '@/server/templates/get-team-templates'
import ErrorBoundary from '@/ui/error'
import { Suspense } from 'react'
import LoadingLayout from '../../loading'

interface PageProps {
  params: Promise<{
    teamIdOrSlug: string
  }>
}

export default async function Page({ params }: PageProps) {
  const { teamIdOrSlug } = await params

  return (
    <DashboardPageLayout title="Templates" fullscreen>
      <Suspense fallback={<LoadingLayout />}>
        <PageContent teamIdOrSlug={teamIdOrSlug} />
      </Suspense>
    </DashboardPageLayout>
  )
}

interface PageContentProps {
  teamIdOrSlug: string
}

async function PageContent({ teamIdOrSlug }: PageContentProps) {
  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  const res = await getTeamTemplates({
    teamId,
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
