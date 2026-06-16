'use client'

import type { CSSProperties, PointerEvent } from 'react'
import { useRef } from 'react'
import type { SandboxManagementAuth } from '@/core/shared/sandbox-management-auth'
import DashboardTerminal from '@/features/dashboard/terminal/dashboard-terminal'
import { cn } from '@/lib/utils/ui'
import {
  MINIMIZED_TERMINAL_HEIGHT_PX,
  MINIMIZED_TERMINAL_STACK_GAP_PX,
} from './constants'
import type { AgentTerminalWindow, WindowPosition, WindowSize } from './types'
import { clampWindowPosition, clampWindowSize } from './utils'

export function AgentTerminalWindowLayer({
  activeWindowId,
  sandboxManagementAuth,
  teamSlug,
  windows,
  onActivateWindow,
  onCloseWindow,
  onMinimizeWindow,
  onMoveWindow,
  onResizeWindow,
  onSandboxAttached,
}: {
  activeWindowId: string | null
  sandboxManagementAuth: SandboxManagementAuth
  teamSlug: string
  windows: AgentTerminalWindow[]
  onActivateWindow: (windowId: string) => void
  onCloseWindow: (windowId: string) => void
  onMinimizeWindow: (windowId: string) => void
  onMoveWindow: (windowId: string, position: WindowPosition) => void
  onResizeWindow: (windowId: string, size: WindowSize) => void
  onSandboxAttached: (windowId: string, sandboxId: string) => void
}) {
  const layerRef = useRef<HTMLDivElement>(null)

  if (windows.length === 0) {
    return null
  }

  const handleWindowDragStart = (
    event: PointerEvent<HTMLDivElement>,
    terminalWindow: AgentTerminalWindow
  ) => {
    const target = event.target as HTMLElement | null

    if (
      terminalWindow.minimized ||
      target?.closest('button,a,input,textarea,select,[role="button"]') ||
      window.matchMedia('(max-width: 767px)').matches
    ) {
      return
    }

    const layerElement = layerRef.current
    const windowElement = event.currentTarget.closest(
      '[data-agent-terminal-window]'
    ) as HTMLElement | null

    if (!layerElement || !windowElement) {
      return
    }

    event.preventDefault()
    onActivateWindow(terminalWindow.id)

    const layerRect = layerElement.getBoundingClientRect()
    const windowRect = windowElement.getBoundingClientRect()
    const startPosition = terminalWindow.position
    const startPointer = {
      x: event.clientX,
      y: event.clientY,
    }

    const handlePointerMove = (pointerEvent: globalThis.PointerEvent) => {
      onMoveWindow(
        terminalWindow.id,
        clampWindowPosition({
          layerRect,
          position: {
            x: startPosition.x + pointerEvent.clientX - startPointer.x,
            y: startPosition.y + pointerEvent.clientY - startPointer.y,
          },
          windowRect,
        })
      )
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
  }

  const handleWindowResizeStart = (
    event: PointerEvent<HTMLElement>,
    terminalWindow: AgentTerminalWindow
  ) => {
    if (
      terminalWindow.minimized ||
      window.matchMedia('(max-width: 767px)').matches
    ) {
      return
    }

    const layerElement = layerRef.current

    if (!layerElement) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    onActivateWindow(terminalWindow.id)

    const layerRect = layerElement.getBoundingClientRect()
    const startSize = terminalWindow.size
    const startPointer = {
      x: event.clientX,
      y: event.clientY,
    }

    const handlePointerMove = (pointerEvent: globalThis.PointerEvent) => {
      onResizeWindow(
        terminalWindow.id,
        clampWindowSize({
          layerRect,
          position: terminalWindow.position,
          size: {
            height: startSize.height + pointerEvent.clientY - startPointer.y,
            width: startSize.width + pointerEvent.clientX - startPointer.x,
          },
        })
      )
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
  }

  return (
    <div
      ref={layerRef}
      className="pointer-events-none fixed top-18 right-2 bottom-4 left-2 z-40 md:right-4 md:bottom-10 md:left-[calc(var(--sidebar-width-active)+1rem)]"
    >
      {windows.map((terminalWindow) => {
        const isActive = activeWindowId === terminalWindow.id
        const minimizedIndex = windows
          .filter((candidate) => candidate.minimized)
          .sort(
            (a, b) =>
              (a.minimizedOrder ?? Number.MAX_SAFE_INTEGER) -
              (b.minimizedOrder ?? Number.MAX_SAFE_INTEGER)
          )
          .findIndex((candidate) => candidate.id === terminalWindow.id)
        const windowStyle = terminalWindow.minimized
          ? {
              bottom:
                minimizedIndex *
                (MINIMIZED_TERMINAL_HEIGHT_PX +
                  MINIMIZED_TERMINAL_STACK_GAP_PX),
              left: 0,
            }
          : ({
              '--terminal-window-height': `${terminalWindow.size.height}px`,
              '--terminal-window-width': `${terminalWindow.size.width}px`,
              '--terminal-window-x': `${terminalWindow.position.x}px`,
              '--terminal-window-y': `${terminalWindow.position.y}px`,
            } as CSSProperties)

        return (
          <fieldset
            data-agent-terminal-window
            className={cn(
              'pointer-events-auto absolute m-0 min-w-0 border-0 p-0 shadow-xl',
              terminalWindow.minimized
                ? 'bottom-0 left-0 h-10 w-[min(18rem,calc(100%_-_1rem))]'
                : 'top-0 left-0 h-full w-full md:top-[var(--terminal-window-y)] md:left-[var(--terminal-window-x)] md:h-[min(var(--terminal-window-height),calc(100%_-_2rem))] md:w-[min(var(--terminal-window-width),calc(100%_-_2rem))]',
              isActive && 'z-10'
            )}
            key={terminalWindow.id}
            style={windowStyle}
            onPointerDown={() => onActivateWindow(terminalWindow.id)}
          >
            <legend className="sr-only">
              {terminalWindow.template.name} terminal window
            </legend>
            <DashboardTerminal
              autoStart
              forceNewSandbox={terminalWindow.forceNewSandbox}
              isWindowMinimized={terminalWindow.minimized}
              launchTarget={{
                command: terminalWindow.command,
                confirmCommand: terminalWindow.command ? false : undefined,
                sandboxId: terminalWindow.sandboxId,
                template: terminalWindow.template.template,
              }}
              sandboxManagementAuth={sandboxManagementAuth}
              storeTerminalSession={false}
              syncUrl={false}
              teamSlug={teamSlug}
              onWindowDragStart={(event) =>
                handleWindowDragStart(event, terminalWindow)
              }
              onSandboxAttached={(sandboxId) =>
                onSandboxAttached(terminalWindow.id, sandboxId)
              }
              onWindowClose={() => onCloseWindow(terminalWindow.id)}
              onWindowMinimize={() => {
                if (terminalWindow.minimized) {
                  onActivateWindow(terminalWindow.id)
                  return
                }

                onMinimizeWindow(terminalWindow.id)
              }}
            />
            {terminalWindow.minimized ? null : (
              <div
                aria-hidden
                className="border-fg-tertiary/70 hover:border-fg-secondary focus-visible:ring-focus absolute right-1 bottom-1 hidden size-4 cursor-nwse-resize border-r border-b bg-transparent focus-visible:ring-2 focus-visible:outline-none md:block"
                onPointerDown={(event) =>
                  handleWindowResizeStart(event, terminalWindow)
                }
              />
            )}
          </fieldset>
        )
      })}
    </div>
  )
}
