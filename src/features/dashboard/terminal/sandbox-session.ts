import Sandbox from 'e2b'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { supabase } from '@/core/shared/clients/supabase/client'
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
  shouldStoreSession?: boolean
  sandboxId?: string
  teamId: string
  template: string
}

export async function openTerminalSandbox({
  forceNewSandbox = false,
  onStatus,
  requestTimeoutMs,
  shouldStoreSession,
  sandboxId,
  teamId,
  template,
}: OpenTerminalSandboxOptions) {
  const { data } = await supabase.auth.getSession()

  if (!data.session) {
    throw new Error('You need to sign in before opening a terminal.')
  }

  const userId = data.session.user.id
  const headers = SUPABASE_AUTH_HEADERS(data.session.access_token, teamId)

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
    domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
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
  // The browser SDK sends the signed-in user's Supabase token so E2B can
  // authorize sandbox ownership without a dashboard proxy endpoint.
  return Sandbox.create(template, {
    domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
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
