import Link from 'next/link'
import type { Metadata } from 'next/types'
import { authHeaders } from '@/configs/api'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { createUserTeamsRepository } from '@/core/modules/teams/user-teams-repository.server'
import {
  createDefaultTemplatesRepository,
  createTemplatesRepository,
} from '@/core/modules/templates/repository.server'
import { getAuthContext } from '@/core/server/auth'
import { infra } from '@/core/shared/clients/api'
import { createSandboxManagementAuth } from '@/core/shared/sandbox-management-auth.server'
import { SandboxIdSchema } from '@/core/shared/schemas/api'
import DashboardTerminal from '@/features/dashboard/terminal/dashboard-terminal'
import { normalizeTerminalTemplate } from '@/features/dashboard/terminal/template'
import { Button } from '@/ui/primitives/button'

export const metadata: Metadata = {
  title: 'Terminal - E2B',
  robots: 'noindex, nofollow',
}

interface TeamTerminalPageProps {
  params: Promise<{
    teamSlug: string
  }>
  searchParams: Promise<{
    command?: string
    sandboxId?: string
    template?: string
  }>
}

export default async function TeamTerminalPage({
  params,
  searchParams,
}: TeamTerminalPageProps) {
  const [{ teamSlug }, { command = '', sandboxId, template }] =
    await Promise.all([params, searchParams])
  const terminalTemplate = normalizeTerminalTemplate(template)
  const terminalSandboxId = normalizeTerminalSandboxId(sandboxId)

  if (!terminalTemplate) {
    return <TerminalUnavailable message="The terminal template is invalid." />
  }

  if (terminalSandboxId === null) {
    return <TerminalUnavailable message="The terminal sandbox ID is invalid." />
  }

  const authContext = await getAuthContext()

  if (!authContext) {
    return (
      <TerminalSignIn
        command={command}
        sandboxId={terminalSandboxId}
        teamSlug={teamSlug}
        template={terminalTemplate}
      />
    )
  }

  const teamsRepository = createUserTeamsRepository({
    accessToken: authContext.accessToken,
  })
  const teamsResult = await teamsRepository.listUserTeams()

  if (!teamsResult.ok) {
    return <TerminalUnavailable />
  }

  const team = teamsResult.data.find((candidate) => candidate.slug === teamSlug)

  if (!team) {
    return <TerminalUnavailable />
  }

  if (
    terminalSandboxId &&
    !(await hasSandboxInTeam({
      accessToken: authContext.accessToken,
      sandboxId: terminalSandboxId,
      teamId: team.id,
    }))
  ) {
    return (
      <TerminalUnavailable message="Sandbox not found or you do not have access to it." />
    )
  }

  const templateAvailable = terminalSandboxId
    ? { ok: true as const, available: true }
    : await isTerminalTemplateAvailable({
        accessToken: authContext.accessToken,
        teamId: team.id,
        template: terminalTemplate,
      })

  if (!templateAvailable.ok) {
    return (
      <TerminalUnavailable message="We could not verify the terminal template for this account." />
    )
  }

  if (!templateAvailable.available) {
    return (
      <TerminalUnavailable
        message={`Template "${terminalTemplate}" is not available for this account.`}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden p-3 md:p-6">
      <DashboardTerminal
        autoStart
        launchTarget={{
          command,
          sandboxId: terminalSandboxId,
          template: terminalTemplate,
        }}
        sandboxManagementAuth={createSandboxManagementAuth(
          authContext,
          team.id
        )}
        teamSlug={team.slug}
      />
    </div>
  )
}

function normalizeTerminalSandboxId(sandboxId?: string) {
  const value = sandboxId?.trim()
  if (!value) return undefined

  const parsedSandboxId = SandboxIdSchema.safeParse(value)
  return parsedSandboxId.success ? parsedSandboxId.data : null
}

async function hasSandboxInTeam({
  accessToken,
  sandboxId,
  teamId,
}: {
  accessToken: string
  sandboxId: string
  teamId: string
}) {
  try {
    const result = await infra.GET('/sandboxes/{sandboxID}', {
      params: {
        path: {
          sandboxID: sandboxId,
        },
      },
      headers: {
        ...authHeaders(accessToken, teamId),
      },
      cache: 'no-store',
    })

    return result.response.ok && Boolean(result.data)
  } catch {
    return false
  }
}

async function isTerminalTemplateAvailable({
  accessToken,
  teamId,
  template,
}: {
  accessToken: string
  teamId: string
  template: string
}) {
  if (template === 'base') {
    return { ok: true as const, available: true }
  }

  const defaultTemplatesRepository = createDefaultTemplatesRepository({
    accessToken,
  })
  const teamTemplatesRepository = createTemplatesRepository({
    accessToken,
    teamId,
  })
  const [defaultTemplates, teamTemplates] = await Promise.all([
    defaultTemplatesRepository.getDefaultTemplatesCached(),
    teamTemplatesRepository.getTeamTemplates(),
  ])

  if (!defaultTemplates.ok || !teamTemplates.ok) {
    return { ok: false as const }
  }

  const templates = [
    ...defaultTemplates.data.templates,
    ...teamTemplates.data.templates,
  ]

  return {
    ok: true as const,
    available: templates.some((candidate) =>
      [
        candidate.templateID,
        ...(candidate.aliases ?? []),
        ...(candidate.names ?? []),
      ].includes(template)
    ),
  }
}

function TerminalSignIn({
  command,
  sandboxId,
  teamSlug,
  template,
}: {
  command?: string
  sandboxId?: string
  teamSlug: string
  template: string
}) {
  const returnToQuery = new URLSearchParams({
    ...(command ? { command } : {}),
    ...(sandboxId ? { sandboxId } : {}),
    template,
  }).toString()
  const returnTo = `${PROTECTED_URLS.TERMINAL(teamSlug)}${
    returnToQuery ? `?${returnToQuery}` : ''
  }`
  const signInHref = `${AUTH_URLS.SIGN_IN}?${new URLSearchParams({
    returnTo,
  }).toString()}`

  return (
    <main className="flex h-dvh min-h-[360px] items-center justify-center bg-bg p-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div>
          <h1 className="text-lg font-medium">Sign in to open a terminal</h1>
          <p className="text-fg-secondary mt-2 text-sm">
            The terminal runs in your E2B dashboard account.
          </p>
        </div>
        <Button asChild>
          <Link href={signInHref} target="_top">
            Sign in
          </Link>
        </Button>
      </div>
    </main>
  )
}

function TerminalUnavailable({
  message = 'We could not resolve a dashboard team for this account.',
}: {
  message?: string
}) {
  return (
    <main className="flex h-dvh min-h-[360px] items-center justify-center bg-bg p-6">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-medium">Terminal unavailable</h1>
        <p className="text-fg-secondary mt-2 text-sm">{message}</p>
      </div>
    </main>
  )
}
