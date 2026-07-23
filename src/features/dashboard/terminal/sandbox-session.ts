import type { Sandbox } from 'e2b'
import { createEnvdSandbox } from '@/core/shared/create-envd-sandbox'
import type { TRPCRouterOutputs } from '@/trpc/client'
import {
  clearStoredTerminalSession,
  readStoredTerminalSession,
  writeStoredTerminalSession,
} from './storage'

type TerminalSandboxConnection = TRPCRouterOutputs['sandbox']['openTerminal']

interface OpenTerminalMutationInput {
  template: string
  sandboxId?: string
  requestTimeoutMs?: number
}

/**
 * Performs the `sandbox.openTerminal` tRPC mutation. Injected from the
 * component (via the vanilla tRPC client) so this orchestration helper stays
 * usable outside of a React hook.
 */
export type OpenTerminalMutation = (
  input: OpenTerminalMutationInput
) => Promise<TerminalSandboxConnection>

interface OpenTerminalSandboxOptions {
  forceNewSandbox?: boolean
  onStatus: (message: string) => void
  openTerminal: OpenTerminalMutation
  requestTimeoutMs?: number
  shouldStoreSession?: boolean
  sandboxId?: string
  template: string
}

export async function openTerminalSandbox({
  forceNewSandbox = false,
  onStatus,
  openTerminal,
  requestTimeoutMs,
  shouldStoreSession,
  sandboxId,
  template,
}: OpenTerminalSandboxOptions) {
  if (sandboxId) {
    onStatus(`Connecting to terminal sandbox ${sandboxId}...\r\n`)
    const sandbox = await acquireTerminalSandbox(
      openTerminal,
      { template, sandboxId, requestTimeoutMs },
      'Failed to connect to terminal sandbox'
    )

    return {
      sandbox,
    }
  }

  const storedTerminalSession = forceNewSandbox
    ? null
    : readStoredTerminalSession()

  let sandbox: Sandbox

  if (storedTerminalSession?.template === template) {
    onStatus(
      `Reconnecting to terminal sandbox ${storedTerminalSession.sandboxId}...\r\n`
    )

    try {
      sandbox = await acquireTerminalSandbox(
        openTerminal,
        {
          template,
          sandboxId: storedTerminalSession.sandboxId,
          requestTimeoutMs,
        },
        'Failed to connect to terminal sandbox'
      )
    } catch {
      clearStoredTerminalSession()
      onStatus('Stored terminal sandbox is unavailable.\r\n')
      onStatus(`Starting ${template} terminal sandbox...\r\n`)
      sandbox = await acquireTerminalSandbox(
        openTerminal,
        { template },
        'Failed to create terminal sandbox'
      )
    }
  } else {
    onStatus(`Starting ${template} terminal sandbox...\r\n`)
    sandbox = await acquireTerminalSandbox(
      openTerminal,
      { template },
      'Failed to create terminal sandbox'
    )
  }

  if (shouldStoreSession ?? true) {
    writeStoredTerminalSession({
      sandboxId: sandbox.sandboxId,
      template,
    })
  }

  return {
    sandbox,
  }
}

async function acquireTerminalSandbox(
  openTerminal: OpenTerminalMutation,
  input: OpenTerminalMutationInput,
  fallbackMessage: string
): Promise<Sandbox> {
  let connection: TerminalSandboxConnection

  try {
    connection = await openTerminal(input)
  } catch (error) {
    throw error instanceof Error ? error : new Error(fallbackMessage)
  }

  return createEnvdSandbox({
    ...connection,
    domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
    sandboxUrl: process.env.NEXT_PUBLIC_E2B_SANDBOX_URL,
  })
}
