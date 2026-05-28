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
  command: string
  target?: TerminalLaunchTarget
}

export type TerminalLaunchTarget = {
  command?: string
  sandboxId?: string
  template?: string
}
