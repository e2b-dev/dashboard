'use client'

import type { DashboardTerminalCommandDetail } from './types'

export const DASHBOARD_TERMINAL_COMMAND_EVENT = 'dashboard-terminal:command'

export function openDashboardTerminal(command?: string) {
  window.dispatchEvent(
    new CustomEvent<DashboardTerminalCommandDetail>(
      DASHBOARD_TERMINAL_COMMAND_EVENT,
      {
        detail: {
          command: command ?? '',
        },
      }
    )
  )
}
