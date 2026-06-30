import type { Sandbox } from 'e2b'
import type { TerminalPtyOptions } from './pty-options'

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
  target?: TerminalLaunchTarget
}

export type TerminalLaunchTarget = {
  command?: string
  forceNewSandbox?: boolean
  ptyOptions?: TerminalPtyOptions
  requiresConfirmation?: boolean
  sandboxId?: string
  template?: string
}

export type TerminalSandboxResolver = () => Promise<Sandbox>
