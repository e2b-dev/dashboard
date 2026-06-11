import Sandbox from 'e2b'
import type { SandboxManagementAuth } from '@/core/shared/sandbox-management-auth'
import { TERMINAL_SANDBOX_TIMEOUT_MS } from './constants'
import {
  clearStoredTerminalSession,
  readStoredTerminalSession,
  writeStoredTerminalSession,
} from './storage'

interface OpenTerminalSandboxOptions {
  forceNewSandbox?: boolean
  onStatus: (message: string) => void
  requestTimeoutMs?: number
  sandboxManagementAuth: SandboxManagementAuth
  shouldStoreSession?: boolean
  sandboxId?: string
  template: string
}

export async function openTerminalSandbox({
  forceNewSandbox = false,
  onStatus,
  requestTimeoutMs,
  sandboxManagementAuth,
  shouldStoreSession,
  sandboxId,
  template,
}: OpenTerminalSandboxOptions) {
  const { headers, userId } = sandboxManagementAuth

  if (sandboxId) {
    onStatus(`Connecting to terminal sandbox ${sandboxId}...\r\n`)
    const sandbox = await connectTerminalSandbox(sandboxId, headers, {
      requestTimeoutMs,
    })

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
        storedTerminalSession.sandboxId,
        headers,
        { requestTimeoutMs }
      )
    } catch {
      clearStoredTerminalSession(userId)
      onStatus('Stored terminal sandbox is unavailable.\r\n')
      onStatus(`Starting ${template} terminal sandbox...\r\n`)
      sandbox = await createTerminalSandbox({ headers, template, userId })
    }
  } else {
    onStatus(`Starting ${template} terminal sandbox...\r\n`)
    sandbox = await createTerminalSandbox({ headers, template, userId })
  }

  if (shouldStoreSession ?? true) {
    writeStoredTerminalSession(userId, {
      sandboxId: sandbox.sandboxId,
      template,
    })
  }

  return {
    sandbox,
  }
}

function connectTerminalSandbox(
  sandboxId: string,
  headers: Record<string, string>,
  options: { requestTimeoutMs?: number } = {}
) {
  return Sandbox.connect(sandboxId, {
    apiUrl: process.env.NEXT_PUBLIC_INFRA_API_URL,
    domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
    sandboxUrl: process.env.NEXT_PUBLIC_E2B_SANDBOX_URL,
    timeoutMs: TERMINAL_SANDBOX_TIMEOUT_MS,
    requestTimeoutMs: options.requestTimeoutMs,
    headers: {
      ...headers,
    },
  })
}

function createTerminalSandbox({
  headers,
  template,
  userId,
}: {
  headers: Record<string, string>
  template: string
  userId: string
}) {
  return Sandbox.create(template, {
    apiUrl: process.env.NEXT_PUBLIC_INFRA_API_URL,
    domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
    sandboxUrl: process.env.NEXT_PUBLIC_E2B_SANDBOX_URL,
    timeoutMs: TERMINAL_SANDBOX_TIMEOUT_MS,
    lifecycle: {
      onTimeout: 'pause',
      autoResume: true,
    },
    metadata: {
      source: 'dashboard-terminal',
      template,
      userId,
    },
    headers: {
      ...headers,
    },
  })
}
