import type { Sandbox } from 'e2b'

export type TerminalStatus = 'idle' | 'starting' | 'ready' | 'error'

export type StoredTerminalSession = {
  sandboxId: string
  template: string
}

export type StartTerminalOptions = {
  forceNewSandbox?: boolean
  target?: TerminalLaunchTarget
}

export type PendingTerminalLaunch = {
  command?: string
  forceNewSandbox?: boolean
  target?: TerminalLaunchTarget
  untrustedTemplateProvider?: string
}

export type TerminalLaunchTarget = {
  command?: string
  sandboxId?: string
  template?: string
}

export type TerminalSandboxResolver = () => Promise<Sandbox>
