'use client'

import { useEffect, useRef, useState } from 'react'
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

  useEffect(() => {
    terminalWindowsRef.current = terminalWindows
  }, [terminalWindows])

  const focusWindow = (windowId: string) => {
    setActiveWindowId(windowId)
    setTerminalWindows((currentWindows) =>
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
        const nextWindows = currentWindows.map((terminalWindow) =>
          terminalWindow.id === existingWindow.id
            ? { ...terminalWindow, minimized: false }
            : terminalWindow
        )
        terminalWindowsRef.current = nextWindows
        setTerminalWindows(nextWindows)
        setActiveWindowId(existingWindow.id)
        return
      }
    }

    const windowId = `agent-terminal-${template.id}-${nextWindowIdRef.current}`
    nextWindowIdRef.current += 1
    const nextWindows = [
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
    ]

    terminalWindowsRef.current = nextWindows
    setTerminalWindows(nextWindows)
    setActiveWindowId(windowId)
  }

  const closeWindow = (windowId: string) => {
    setTerminalWindows((currentWindows) =>
      currentWindows.filter((terminalWindow) => terminalWindow.id !== windowId)
    )
    setActiveWindowId((currentWindowId) =>
      currentWindowId === windowId ? null : currentWindowId
    )
  }

  const minimizeWindow = (windowId: string) => {
    setTerminalWindows((currentWindows) =>
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
    setTerminalWindows((currentWindows) =>
      currentWindows.map((terminalWindow) =>
        terminalWindow.id === windowId
          ? { ...terminalWindow, position }
          : terminalWindow
      )
    )
  }

  const resizeWindow = (windowId: string, size: WindowSize) => {
    setTerminalWindows((currentWindows) =>
      currentWindows.map((terminalWindow) =>
        terminalWindow.id === windowId
          ? { ...terminalWindow, size }
          : terminalWindow
      )
    )
  }

  const attachSandboxToWindow = (windowId: string, sandboxId: string) => {
    setTerminalWindows((currentWindows) =>
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
