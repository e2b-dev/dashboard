export type TerminalStatus = 'idle' | 'starting' | 'ready' | 'error'

export type StoredTerminalSession = {
  sandboxId: string
  template: string
}

export type StartTerminalOptions = {
  forceNewSandbox?: boolean
  template?: string
}

export type DashboardTerminalCommandDetail = {
  command: string
  forceNewSandbox?: boolean
  template?: string
}

export type PendingTerminalLaunch = {
  command: string
  template: string
}
