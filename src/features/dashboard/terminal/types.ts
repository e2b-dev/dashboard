import type { Sandbox } from 'e2b'

export type TerminalStatus = 'idle' | 'starting' | 'ready' | 'error'

export type StoredTerminalSession = {
  sandboxId: string
  template: string
}

export type StartTerminalOptions = {
  confirmCommand?: boolean
  forceNewSandbox?: boolean
  target?: TerminalLaunchTarget
}

export type PendingTerminalLaunch = {
  command: string
  forceNewSandbox?: boolean
  target?: TerminalLaunchTarget
}

export type TerminalLaunchTarget = {
  command?: string
  confirmCommand?: boolean
  sandboxId?: string
  template?: string
}

export type TerminalSandboxResolver = () => Promise<Sandbox>
