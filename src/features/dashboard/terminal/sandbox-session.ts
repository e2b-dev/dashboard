import type Sandbox from 'e2b'
import { openTerminalSandboxAction } from '@/core/server/actions/terminal-actions'
import { createEnvdSandbox } from '@/core/shared/create-envd-sandbox'
import {
  clearStoredTerminalSession,
  readStoredTerminalSession,
  writeStoredTerminalSession,
} from './storage'

interface OpenTerminalSandboxOptions {
  forceNewSandbox?: boolean
  onStatus: (message: string) => void
  teamSlug: string
  userId: string
  sandboxId?: string
  template: string
}

export async function openTerminalSandbox({
  forceNewSandbox = false,
  onStatus,
  teamSlug,
  userId,
  sandboxId,
  template,
}: OpenTerminalSandboxOptions) {
  if (sandboxId) {
    onStatus(`Connecting to terminal sandbox ${sandboxId}...\r\n`)
    const sandbox = await connectTerminalSandbox(teamSlug, template, sandboxId)

    return {
      sandbox,
    }
  }

  const storedTerminalSession = forceNewSandbox
    ? null
    : readStoredTerminalSession(userId)

  let sandbox: Sandbox

  if (storedTerminalSession?.template === template) {
    onStatus(
      `Reconnecting to terminal sandbox ${storedTerminalSession.sandboxId}...\r\n`
    )

    try {
      sandbox = await connectTerminalSandbox(
        teamSlug,
        template,
        storedTerminalSession.sandboxId
      )
    } catch {
      clearStoredTerminalSession(userId)
      onStatus('Stored terminal sandbox is unavailable.\r\n')
      onStatus(`Starting ${template} terminal sandbox...\r\n`)
      sandbox = await createTerminalSandbox(teamSlug, template)
    }
  } else {
    onStatus(`Starting ${template} terminal sandbox...\r\n`)
    sandbox = await createTerminalSandbox(teamSlug, template)
  }

  writeStoredTerminalSession(userId, {
    sandboxId: sandbox.sandboxId,
    template,
  })

  return {
    sandbox,
  }
}

async function connectTerminalSandbox(
  teamSlug: string,
  template: string,
  sandboxId: string
): Promise<Sandbox> {
  const result = await openTerminalSandboxAction({
    teamSlug,
    template,
    sandboxId,
  })

  return toEnvdSandbox(result, 'Failed to connect to terminal sandbox')
}

async function createTerminalSandbox(
  teamSlug: string,
  template: string
): Promise<Sandbox> {
  const result = await openTerminalSandboxAction({ teamSlug, template })

  return toEnvdSandbox(result, 'Failed to create terminal sandbox')
}

function toEnvdSandbox(
  result: Awaited<ReturnType<typeof openTerminalSandboxAction>>,
  fallbackMessage: string
): Sandbox {
  if (!result?.data) {
    throw new Error(result?.serverError ?? fallbackMessage)
  }

  return createEnvdSandbox({
    ...result.data,
    domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
  })
}
