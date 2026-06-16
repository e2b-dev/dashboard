'use client'

import { useRef, useState } from 'react'
import type { AgentTemplateConfig } from '@/configs/agents'
import {
  TERMINAL_WINDOW_DEFAULT_HEIGHT_PX,
  TERMINAL_WINDOW_DEFAULT_WIDTH_PX,
} from './constants'
import type { AgentTerminalWindow, WindowPosition, WindowSize } from './types'
import { getInitialWindowPosition } from './utils'

export function useAgentTerminalWindows() {
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null)
  const [terminalWindows, setTerminalWindows] = useState<AgentTerminalWindow[]>(
    []
  )
  const terminalWindowsRef = useRef<AgentTerminalWindow[]>([])
  const nextWindowIdRef = useRef(0)
  const nextMinimizedOrderRef = useRef(0)

  const updateTerminalWindows = (
    updater:
      | AgentTerminalWindow[]
      | ((currentWindows: AgentTerminalWindow[]) => AgentTerminalWindow[])
  ) => {
    const nextWindows =
      typeof updater === 'function'
        ? updater(terminalWindowsRef.current)
        : updater

    terminalWindowsRef.current = nextWindows
    setTerminalWindows(nextWindows)

    return nextWindows
  }

  const focusWindow = (windowId: string) => {
    setActiveWindowId(windowId)
    updateTerminalWindows((currentWindows) =>
      currentWindows.map((terminalWindow) =>
        terminalWindow.id === windowId
          ? { ...terminalWindow, minimized: false }
          : terminalWindow
      )
    )
  }

  const openTerminalWindow = ({
    forceNewSandbox,
    sandboxId,
    template,
  }: {
    forceNewSandbox?: boolean
    sandboxId?: string
    template: AgentTemplateConfig
  }) => {
    const currentWindows = terminalWindowsRef.current

    if (sandboxId) {
      const existingWindow = currentWindows.find(
        (terminalWindow) => terminalWindow.sandboxId === sandboxId
      )

      if (existingWindow) {
        updateTerminalWindows((currentWindows) =>
          currentWindows.map((terminalWindow) =>
            terminalWindow.id === existingWindow.id
              ? { ...terminalWindow, minimized: false }
              : terminalWindow
          )
        )
        setActiveWindowId(existingWindow.id)
        return
      }
    }

    const windowId = `agent-terminal-${template.id}-${nextWindowIdRef.current}`
    nextWindowIdRef.current += 1
    updateTerminalWindows((currentWindows) => [
      ...currentWindows,
      {
        command: forceNewSandbox ? template.command : undefined,
        id: windowId,
        forceNewSandbox,
        minimized: false,
        position: getInitialWindowPosition(currentWindows.length),
        sandboxId,
        size: {
          height: TERMINAL_WINDOW_DEFAULT_HEIGHT_PX,
          width: TERMINAL_WINDOW_DEFAULT_WIDTH_PX,
        },
        template,
      },
    ])

    setActiveWindowId(windowId)
  }

  const closeWindow = (windowId: string) => {
    updateTerminalWindows((currentWindows) =>
      currentWindows.filter((terminalWindow) => terminalWindow.id !== windowId)
    )
    setActiveWindowId((currentWindowId) =>
      currentWindowId === windowId ? null : currentWindowId
    )
  }

  const minimizeWindow = (windowId: string) => {
    updateTerminalWindows((currentWindows) =>
      currentWindows.map((terminalWindow) =>
        terminalWindow.id === windowId
          ? {
              ...terminalWindow,
              minimized: true,
              minimizedOrder: nextMinimizedOrderRef.current,
            }
          : terminalWindow
      )
    )
    nextMinimizedOrderRef.current += 1
  }

  const moveWindow = (windowId: string, position: WindowPosition) => {
    updateTerminalWindows((currentWindows) =>
      currentWindows.map((terminalWindow) =>
        terminalWindow.id === windowId
          ? { ...terminalWindow, position }
          : terminalWindow
      )
    )
  }

  const resizeWindow = (windowId: string, size: WindowSize) => {
    updateTerminalWindows((currentWindows) =>
      currentWindows.map((terminalWindow) =>
        terminalWindow.id === windowId
          ? { ...terminalWindow, size }
          : terminalWindow
      )
    )
  }

  const attachSandboxToWindow = (windowId: string, sandboxId: string) => {
    updateTerminalWindows((currentWindows) =>
      currentWindows.map((terminalWindow) =>
        terminalWindow.id === windowId
          ? {
              ...terminalWindow,
              command: undefined,
              forceNewSandbox: false,
              sandboxId,
            }
          : terminalWindow
      )
    )
  }

  return {
    activeWindowId,
    attachSandboxToWindow,
    closeWindow,
    focusWindow,
    minimizeWindow,
    moveWindow,
    openTerminalWindow,
    resizeWindow,
    terminalWindows,
  }
}
