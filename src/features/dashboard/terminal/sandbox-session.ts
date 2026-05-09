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
  teamId: string
  template: string
}

export async function openTerminalSandbox({
  forceNewSandbox = false,
  onStatus,
  teamId,
  template,
}: OpenTerminalSandboxOptions) {
  const { data } = await supabase.auth.getSession()

  if (!data.session) {
    throw new Error('You need to sign in before opening a terminal.')
  }

  const userId = data.session.user.id
  const headers = SUPABASE_AUTH_HEADERS(data.session.access_token, teamId)
  const storedTerminalSession = forceNewSandbox
    ? null
    : readStoredTerminalSession(userId)

  let sandbox: Sandbox

  if (storedTerminalSession?.template === template) {
    onStatus(
      `Reconnecting to terminal sandbox ${storedTerminalSession.sandboxId}...\r\n`
    )

    try {
      sandbox = await Sandbox.connect(storedTerminalSession.sandboxId, {
        domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
        timeoutMs: TERMINAL_SANDBOX_TIMEOUT_MS,
        headers: {
          ...headers,
        },
      })
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

  writeStoredTerminalSession(userId, {
    sandboxId: sandbox.sandboxId,
    template,
  })

  return {
    sandbox,
  }
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
