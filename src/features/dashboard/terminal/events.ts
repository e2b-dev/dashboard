'use client'

import type { DashboardTerminalCommandDetail } from './types'

export const DASHBOARD_TERMINAL_COMMAND_EVENT = 'dashboard-terminal:command'

export function openDashboardTerminal(
  launch?: string | DashboardTerminalCommandDetail
) {
  const detail =
    typeof launch === 'string'
      ? {
          command: launch,
        }
      : {
          command: launch?.command ?? '',
          forceNewSandbox: launch?.forceNewSandbox,
          template: launch?.template,
        }

  window.dispatchEvent(
    new CustomEvent<DashboardTerminalCommandDetail>(
      DASHBOARD_TERMINAL_COMMAND_EVENT,
      {
        detail,
      }
    )
  )
}
