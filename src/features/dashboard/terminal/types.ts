export type TerminalStatus = 'idle' | 'starting' | 'ready' | 'error'

export type StoredTerminalSession = {
  sandboxId: string
  template: string
}

export type StartTerminalOptions = {
  forceNewSandbox?: boolean
  sandboxId?: string
  template?: string
}

export type PendingTerminalLaunch = {
  command: string
  sandboxId?: string
  template: string
}
