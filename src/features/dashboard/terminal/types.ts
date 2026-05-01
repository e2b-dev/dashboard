export type TerminalStatus = 'idle' | 'starting' | 'ready' | 'error'

export type StoredTerminalSession = {
  sandboxId: string
}

export type StartTerminalOptions = {
  forceNewSandbox?: boolean
}

export type DashboardTerminalCommandDetail = {
  command: string
  forceNewSandbox?: boolean
}
