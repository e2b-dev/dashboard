import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { featureFlags } from '@/core/modules/feature-flags/feature-flags.server'
import { getAuthContext } from '@/core/server/auth'
import { getTeamIdFromSlug } from '@/core/server/functions/team/get-team-id-from-slug'
import {
  DECLARED_CONNECTIONS,
  mergeConnectionCatalog,
} from '@/features/dashboard/connections/catalog'
import { Page } from '@/features/dashboard/layouts/page'
import { Button } from '@/ui/primitives/button'
import { IntegrationsIcon } from '@/ui/primitives/icons'

export const metadata: Metadata = {
  title: 'Connections - E2B',
}

type ConnectionsPageProps = {
  params: Promise<{
    teamSlug: string
  }>
}

export default async function ConnectionsPage({
  params,
}: ConnectionsPageProps) {
  const [{ teamSlug }, authContext] = await Promise.all([
    params,
    getAuthContext(),
  ])

  if (!authContext) {
    redirect(AUTH_URLS.SIGN_IN)
  }

  const teamId = await getTeamIdFromSlug(teamSlug, authContext.accessToken)

  if (!teamId.ok || !teamId.data) {
    notFound()
  }

  const featureFlagContext = {
    user: {
      id: authContext.user.id,
      email: authContext.user.email ?? undefined,
    },
    team: {
      id: teamId.data,
    },
  }
  const connectionsEnabled = await featureFlags.isEnabled(
    'connectionsEnabled',
    featureFlagContext
  )

  if (!connectionsEnabled) {
    notFound()
  }

  const additionalConnections = await featureFlags.getPayload(
    'developmentConnections',
    featureFlagContext
  )
  const connections = mergeConnectionCatalog(
    DECLARED_CONNECTIONS,
    additionalConnections
  )

  return (
    <Page>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="prose-title text-fg">Connections</h1>
          <p className="prose-body text-fg-tertiary max-w-2xl">
            Connect services that run workloads in your E2B project.
          </p>
        </header>

        {connections.length > 0 ? (
          <div className="border-stroke border-y">
            {connections.map((connection) => (
              <div
                className="border-stroke flex min-h-24 flex-col items-stretch gap-4 border-b px-3 py-4 last:border-b-0 sm:flex-row sm:items-center md:px-4"
                key={connection.template}
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="border-stroke bg-bg-1 flex size-11 shrink-0 items-center justify-center border">
                    <IntegrationsIcon className="size-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="prose-body-highlight text-fg min-w-0 break-words">
                        {connection.name}
                      </h2>
                      <span className="prose-label text-fg-tertiary border-stroke max-w-full break-all border px-1.5 py-0.5">
                        {connection.template}
                      </span>
                    </div>
                    <p className="prose-body text-fg-tertiary mt-1 break-words">
                      {connection.description}
                    </p>
                  </div>
                </div>
                <Button asChild className="w-full shrink-0 sm:w-auto">
                  <Link
                    aria-label={`Start ${connection.name}`}
                    href={`${PROTECTED_URLS.TERMINAL(teamSlug)}?${new URLSearchParams({ template: connection.template })}`}
                    prefetch={false}
                  >
                    Start
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Page>
  )
}
