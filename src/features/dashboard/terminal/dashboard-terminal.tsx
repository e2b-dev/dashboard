'use client'

import type { CommandHandle, Sandbox } from 'e2b'
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useReducer,
  useRef,
  useState,
} from 'react'
import { useTRPCClient } from '@/trpc/client'
import {
  TERMINAL_ATTACH_ATTEMPT_TIMEOUT_MS,
  TERMINAL_AUTOSTART_DEBOUNCE_MS,
} from './constants'
import DashboardTerminalCommandDialog from './dashboard-terminal-command-dialog'
import { normalizePtyOptions, type TerminalPtyOptions } from './pty-options'
import PtySettingsDialog from './pty-settings-dialog'
import { openTerminalSandbox } from './sandbox-session'
import {
  readStoredTerminalPtyOptions,
  writeStoredTerminalPtyOptions,
} from './storage'
import {
  normalizeTerminalTemplate,
  resolveTerminalTemplateOverride,
} from './template'
import TerminalPanel from './terminal-panel'
import type {
  PendingTerminalLaunch,
  StartTerminalOptions,
  TerminalLaunchTarget,
  TerminalSandboxResolver,
  TerminalStatus,
} from './types'
import { useTerminalInstance } from './use-terminal-instance'

const FLUSH_INPUT_INTERVAL_MS = 0
const FLUSH_INPUT_RETRY_INTERVAL_MS = 250
const MAX_INPUT_FLUSH_RETRIES = 2

interface DashboardTerminalProps {
  allowPtySettings?: boolean
  autoStart?: boolean
  getSandbox?: TerminalSandboxResolver
  launchTarget?: TerminalLaunchTarget
  onSandboxAttached?: (sandboxId: string) => void
  onSandboxAttachFailed?: (target: TerminalLaunchTarget | undefined) => void
  sandboxConnectRequestTimeoutMs?: number
  sandboxScoped?: boolean
  teamSlug: string
  userId: string
}

type TerminalUiState = {
  isPtySettingsOpen: boolean
  pendingLaunch: PendingTerminalLaunch | null
  ptyOptions: TerminalPtyOptions
}

type TerminalUiAction =
  | { open: boolean; type: 'setPtySettingsOpen' }
  | { launch: PendingTerminalLaunch | null; type: 'setPendingLaunch' }
  | { options: TerminalPtyOptions; type: 'setPtyOptions' }

function terminalUiReducer(
  state: TerminalUiState,
  action: TerminalUiAction
): TerminalUiState {
  switch (action.type) {
    case 'setPtySettingsOpen':
      return { ...state, isPtySettingsOpen: action.open }
    case 'setPendingLaunch':
      return { ...state, pendingLaunch: action.launch }
    case 'setPtyOptions':
      return { ...state, ptyOptions: action.options }
  }
}

function getInitialPtyOptions({
  allowPtySettings,
  launchTargetPtyOptions,
  userId,
}: {
  allowPtySettings: boolean
  launchTargetPtyOptions: TerminalPtyOptions
  userId: string
}) {
  if (!allowPtySettings || typeof window === 'undefined') {
    return launchTargetPtyOptions
  }

  return normalizePtyOptions({
    ...readStoredTerminalPtyOptions(userId),
    ...launchTargetPtyOptions,
  })
}

export default function DashboardTerminal({
  allowPtySettings = false,
  autoStart = false,
  getSandbox,
  launchTarget,
  onSandboxAttached,
  onSandboxAttachFailed,
  sandboxConnectRequestTimeoutMs,
  sandboxScoped = false,
  teamSlug,
  userId,
}: DashboardTerminalProps) {
  const trpcClient = useTRPCClient()

  const [status, setStatus] = useState<TerminalStatus>('idle')
  const [activeSandboxId, setActiveSandboxId] = useState<string>()
  const [template, setTemplate] = useState(
    normalizeTerminalTemplate(launchTarget?.template) ?? 'base'
  )
  const launchTargetPtyOptions = normalizePtyOptions(
    launchTarget?.ptyOptions ?? {}
  )
  const [uiState, dispatchUi] = useReducer(terminalUiReducer, null, () => ({
    isPtySettingsOpen: false,
    pendingLaunch: null,
    ptyOptions: getInitialPtyOptions({
      allowPtySettings,
      launchTargetPtyOptions,
      userId,
    }),
  }))
  const { isPtySettingsOpen, pendingLaunch, ptyOptions } = uiState

  const ptyOptionsRef = useRef<TerminalPtyOptions>(ptyOptions)
  const sandboxRef = useRef<Sandbox | null>(null)
  const ptyRef = useRef<CommandHandle | null>(null)
  const pidRef = useRef<number | undefined>(undefined)
  const pendingInputRef = useRef<Uint8Array[]>([])
  const inputFlushTimerRef = useRef<number | null>(null)
  const inputFlushInFlightRef = useRef(false)
  const inputFlushRetryCountRef = useRef(0)
  const inputGenerationRef = useRef(0)
  const pendingCommandsRef = useRef<string[]>([])
  const isStartingRef = useRef(false)
  const startGenerationRef = useRef(0)

  const abortCurrentStart = useCallback(() => {
    startGenerationRef.current += 1
    isStartingRef.current = false
    if (!ptyRef.current) {
      setStatus('idle')
    }
  }, [])

  const requestPtyKill = useCallback(
    ({ pid, sandboxId }: { pid: number; sandboxId: string }) => {
      void fetch('/api/trpc/sandbox.killTerminalPty?batch=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          0: {
            json: {
              pid,
              sandboxId,
              teamSlug,
            },
          },
        }),
        keepalive: true,
      })
    },
    [teamSlug]
  )

  const clearPendingInput = useCallback(() => {
    if (inputFlushTimerRef.current) {
      window.clearTimeout(inputFlushTimerRef.current)
      inputFlushTimerRef.current = null
    }
    inputGenerationRef.current += 1
    inputFlushInFlightRef.current = false
    inputFlushRetryCountRef.current = 0
    pendingInputRef.current = []
  }, [])

  const flushInputToPty = useCallback((terminalPid = pidRef.current) => {
    inputFlushTimerRef.current = null

    if (inputFlushInFlightRef.current) return

    if (!sandboxRef.current || !terminalPid) {
      pendingInputRef.current = []
      return
    }

    const pendingInput = pendingInputRef.current
    pendingInputRef.current = []
    if (!pendingInput.length) return

    const byteLength = pendingInput.reduce(
      (total, chunk) => total + chunk.byteLength,
      0
    )
    const data = new Uint8Array(byteLength)
    let offset = 0
    for (const chunk of pendingInput) {
      data.set(chunk, offset)
      offset += chunk.byteLength
    }

    const sandbox = sandboxRef.current
    const inputGeneration = inputGenerationRef.current
    inputFlushInFlightRef.current = true
    let shouldRetryPendingInput = false

    void sandbox.pty
      .sendInput(terminalPid, data)
      .then(() => {
        inputFlushRetryCountRef.current = 0
      })
      .catch(() => {
        if (inputGenerationRef.current !== inputGeneration) return
        if (pidRef.current !== terminalPid) return
        if (inputFlushRetryCountRef.current >= MAX_INPUT_FLUSH_RETRIES) return

        inputFlushRetryCountRef.current += 1
        shouldRetryPendingInput = true
        pendingInputRef.current = [data, ...pendingInputRef.current]
      })
      .finally(() => {
        if (inputGenerationRef.current !== inputGeneration) return

        inputFlushInFlightRef.current = false

        if (pidRef.current === terminalPid && pendingInputRef.current.length) {
          if (shouldRetryPendingInput) {
            inputFlushTimerRef.current = window.setTimeout(() => {
              flushInputToPty(terminalPid)
            }, FLUSH_INPUT_RETRY_INTERVAL_MS)
            return
          }

          flushInputToPty(terminalPid)
        }
      })
  }, [])

  const sendInputToPty = useCallback(
    (value: string | Uint8Array, terminalPid = pidRef.current) => {
      if (!value || !sandboxRef.current || !terminalPid) return

      const data =
        typeof value === 'string' ? new TextEncoder().encode(value) : value

      pendingInputRef.current.push(data)

      if (inputFlushTimerRef.current) return

      inputFlushTimerRef.current = window.setTimeout(() => {
        flushInputToPty(terminalPid)
      }, FLUSH_INPUT_INTERVAL_MS)
    },
    [flushInputToPty]
  )

  const resizePty = useCallback((size: { cols: number; rows: number }) => {
    if (sandboxRef.current && pidRef.current) {
      void sandboxRef.current.pty.resize(pidRef.current, size).catch(() => {})
    }
  }, [])

  const {
    appendOutput,
    copyTerminalText,
    focusTerminal,
    resetTerminal,
    resizeTerminal,
    terminalContainerRef,
  } = useTerminalInstance({
    onInput: sendInputToPty,
    onResize: resizePty,
  })

  const closeTerminal = useCallback(async () => {
    clearPendingInput()

    const pty = ptyRef.current
    const sandboxId = sandboxRef.current?.sandboxId
    ptyRef.current = null
    pidRef.current = undefined
    if (!pty) return

    if (sandboxId) {
      requestPtyKill({ pid: pty.pid, sandboxId })
    }

    try {
      await pty.kill()
    } catch {
      // Best-effort cleanup. The sandbox is intentionally left alive.
    }
  }, [clearPendingInput, requestPtyKill])

  const runCommand = useCallback(
    (command: string, terminalPid?: number) => {
      const normalizedCommand = command.trim()
      if (!normalizedCommand) return

      sendInputToPty(`${normalizedCommand}\r`, terminalPid)
    },
    [sendInputToPty]
  )

  const updateTerminalUrl = useCallback(
    ({
      clearCommand = false,
      sandboxId,
    }: {
      clearCommand?: boolean
      sandboxId: string
    }) => {
      const url = new URL(window.location.href)
      let changed = false

      if (!sandboxScoped && url.searchParams.get('sandboxId') !== sandboxId) {
        url.searchParams.set('sandboxId', sandboxId)
        changed = true
      }

      if (clearCommand && url.searchParams.has('command')) {
        url.searchParams.delete('command')
        changed = true
      }

      if (changed) {
        window.history.replaceState(window.history.state, '', url)
      }
    },
    [sandboxScoped]
  )

  const startTerminal = useCallback(
    async (options: StartTerminalOptions = {}) => {
      if (isStartingRef.current) return
      const target = options.target
      const nextTemplate = resolveTerminalTemplateOverride(
        target?.template,
        template
      )

      if (!nextTemplate) {
        setStatus('error')
        appendOutput('Invalid terminal template.\r\n')
        return
      }

      const requestedSandboxId = target?.sandboxId
      const shouldForceNewSandbox =
        options.forceNewSandbox === true || target?.forceNewSandbox === true
      isStartingRef.current = true
      const startGeneration = startGenerationRef.current + 1
      startGenerationRef.current = startGeneration
      const isCurrentStart = () =>
        startGenerationRef.current === startGeneration

      await closeTerminal()
      sandboxRef.current = null
      pidRef.current = undefined
      resetTerminal()
      setStatus('starting')
      setActiveSandboxId(requestedSandboxId)
      setTemplate(nextTemplate)
      appendOutput('Opening terminal...\r\n')

      const openSandbox = async () => {
        let sandbox: Sandbox

        if (getSandbox) {
          appendOutput('Connecting to sandbox...\r\n')
          sandbox = await getSandbox()
        } else {
          const terminalSandbox = await openTerminalSandbox({
            forceNewSandbox: shouldForceNewSandbox,
            onStatus: appendOutput,
            openTerminal: (mutationInput) =>
              trpcClient.sandbox.openTerminal.mutate(mutationInput),
            requestTimeoutMs: requestedSandboxId
              ? (sandboxConnectRequestTimeoutMs ??
                TERMINAL_ATTACH_ATTEMPT_TIMEOUT_MS)
              : undefined,
            shouldStoreSession: !sandboxScoped,
            teamSlug,
            userId,
            sandboxId: requestedSandboxId,
            template: nextTemplate,
          })
          sandbox = terminalSandbox.sandbox
        }

        return sandbox.sandboxId && isCurrentStart() ? sandbox : null
      }

      const openPty = async (sandbox: Sandbox) => {
        appendOutput('Opening PTY...\r\n')
        const terminalSize = resizeTerminal()
        const pty = await sandbox.pty.create({
          cols: terminalSize.cols,
          rows: terminalSize.rows,
          timeoutMs: 0,
          requestTimeoutMs: TERMINAL_ATTACH_ATTEMPT_TIMEOUT_MS,
          ...normalizePtyOptions(ptyOptionsRef.current),
          onData: (data) => {
            appendOutput(data)
          },
        })

        return pty
      }

      try {
        const sandbox = await openSandbox()

        if (!sandbox) {
          if (isCurrentStart()) {
            setStatus('idle')
          }
          return
        }

        appendOutput(`Sandbox ${sandbox.sandboxId} is running.\r\n`)

        const pty = await openPty(sandbox)

        if (!pty) {
          if (isCurrentStart()) {
            setStatus('idle')
          }
          return
        }

        if (!isCurrentStart()) {
          try {
            await pty.kill()
          } catch {
            // The start was superseded or unmounted; best-effort PTY cleanup.
          }
          return
        }

        sandboxRef.current = sandbox
        setActiveSandboxId(sandbox.sandboxId)
        updateTerminalUrl({
          // Keep ?command= until the confirmed command has an attached sandbox.
          clearCommand: pendingCommandsRef.current.length > 0,
          sandboxId: sandbox.sandboxId,
        })
        ptyRef.current = pty
        pidRef.current = pty.pid
        resizeTerminal({ force: true })
        setStatus('ready')
        appendOutput(`PTY ${pty.pid} attached.\r\n`)
        focusTerminal()
        onSandboxAttached?.(sandbox.sandboxId)

        const pendingCommands = pendingCommandsRef.current
        pendingCommandsRef.current = []
        for (const command of pendingCommands) {
          runCommand(command, pty.pid)
        }
      } catch (error) {
        if (!isCurrentStart()) return

        setStatus('error')
        onSandboxAttachFailed?.(target)
        appendOutput(
          `\r\nFailed to start terminal: ${
            error instanceof Error ? error.message : 'Unknown error'
          }\r\n`
        )
      } finally {
        if (isCurrentStart()) {
          isStartingRef.current = false
        }
      }
    },
    [
      appendOutput,
      closeTerminal,
      resizeTerminal,
      resetTerminal,
      focusTerminal,
      getSandbox,
      runCommand,
      trpcClient,
      teamSlug,
      userId,
      sandboxScoped,
      sandboxConnectRequestTimeoutMs,
      template,
      onSandboxAttached,
      onSandboxAttachFailed,
      updateTerminalUrl,
    ]
  )

  const queueTerminalCommand = useCallback(
    (command: string, options: StartTerminalOptions = {}) => {
      const nextTemplate = resolveTerminalTemplateOverride(
        options.target?.template,
        template
      )

      if (!nextTemplate) {
        setStatus('error')
        appendOutput('Invalid terminal template.\r\n')
        return
      }

      if (command.trim() || options.target?.requiresConfirmation) {
        // Commands and PTY settings can come from links, so require an
        // explicit click before using them to start or write to a terminal.
        dispatchUi({
          type: 'setPendingLaunch',
          launch: {
            command: command.trim() || undefined,
            target: {
              ...options.target,
              template: nextTemplate,
            },
          },
        })
        return
      }

      if (status === 'idle' || status === 'error' || options.forceNewSandbox) {
        void startTerminal({
          ...options,
          target: {
            ...options.target,
            template: nextTemplate,
          },
        })
      }
    },
    [appendOutput, startTerminal, status, template]
  )

  const confirmPendingLaunch = useCallback(
    (command?: string, confirmedPtyOptions?: TerminalPtyOptions) => {
      if (!pendingLaunch) return

      const normalizedCommand = command?.trim() ?? ''
      if (pendingLaunch.command && !normalizedCommand) return

      const { target: launchTarget } = pendingLaunch
      const hasConfirmedPtyOptions = confirmedPtyOptions !== undefined
      const nextPtyOptions = hasConfirmedPtyOptions
        ? normalizePtyOptions({
            ...launchTarget?.ptyOptions,
            ...confirmedPtyOptions,
          })
        : ptyOptionsRef.current
      const nextLaunchTarget = {
        ...launchTarget,
        ...(hasConfirmedPtyOptions ? { ptyOptions: nextPtyOptions } : {}),
      }
      const launchTemplate = launchTarget?.template ?? 'base'
      const launchSandboxId = launchTarget?.sandboxId

      if (
        status === 'ready' &&
        template === launchTemplate &&
        launchTarget?.requiresConfirmation !== true &&
        launchTarget?.forceNewSandbox !== true &&
        (!launchSandboxId || activeSandboxId === launchSandboxId)
      ) {
        dispatchUi({ type: 'setPendingLaunch', launch: null })
        if (normalizedCommand) {
          runCommand(normalizedCommand)
        }
        if (activeSandboxId && normalizedCommand) {
          updateTerminalUrl({
            clearCommand: true,
            sandboxId: activeSandboxId,
          })
        }
        return
      }

      if (isStartingRef.current) {
        return
      }

      dispatchUi({ type: 'setPendingLaunch', launch: null })
      if (hasConfirmedPtyOptions) {
        ptyOptionsRef.current = nextPtyOptions
        dispatchUi({ type: 'setPtyOptions', options: nextPtyOptions })
      }
      pendingCommandsRef.current = normalizedCommand ? [normalizedCommand] : []
      void startTerminal({
        forceNewSandbox: !launchSandboxId && template !== launchTemplate,
        target: {
          ...nextLaunchTarget,
          requiresConfirmation: false,
        },
      })
    },
    [
      activeSandboxId,
      pendingLaunch,
      runCommand,
      startTerminal,
      status,
      template,
      updateTerminalUrl,
    ]
  )

  const reconnectTarget = sandboxScoped
    ? launchTarget
    : activeSandboxId
      ? { sandboxId: activeSandboxId, template }
      : undefined
  const reconnectSandboxId = sandboxScoped
    ? launchTarget?.sandboxId
    : activeSandboxId
  const restartLabel = sandboxScoped
    ? 'Reconnect terminal'
    : 'Start new terminal sandbox'
  const restartDisabled =
    status === 'starting' ||
    (sandboxScoped && !reconnectSandboxId && !getSandbox)

  const restartTerminal = useCallback(() => {
    if (sandboxScoped) {
      if (!reconnectSandboxId && !getSandbox) return

      void startTerminal({
        target: reconnectTarget,
      })
      return
    }

    void startTerminal({ forceNewSandbox: true })
  }, [
    getSandbox,
    reconnectTarget,
    reconnectSandboxId,
    sandboxScoped,
    startTerminal,
  ])

  const applyPtyOptions = (
    options: TerminalPtyOptions,
    { makeDefault }: { makeDefault: boolean }
  ) => {
    ptyOptionsRef.current = options
    dispatchUi({ type: 'setPtyOptions', options })
    if (makeDefault) {
      writeStoredTerminalPtyOptions(userId, options)
    }

    if (sandboxScoped) {
      if (!reconnectSandboxId && !getSandbox) return

      void startTerminal({
        target: reconnectTarget,
      })
      return
    }

    if (status === 'ready') {
      void startTerminal({ forceNewSandbox: true })
    }
  }

  useEffect(() => {
    if (!autoStart || status !== 'idle' || isStartingRef.current) return

    const autoStartTimer = window.setTimeout(() => {
      if (isStartingRef.current || ptyRef.current) return

      queueTerminalCommand(launchTarget?.command ?? '', {
        target: launchTarget,
      })
    }, TERMINAL_AUTOSTART_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(autoStartTimer)
    }
  }, [autoStart, launchTarget, queueTerminalCommand, status])

  const handlePageHide = useEffectEvent((event: PageTransitionEvent) => {
    if (event.persisted) return

    abortCurrentStart()
    void closeTerminal()
  })

  const handlePageShow = useEffectEvent((event: PageTransitionEvent) => {
    if (!event.persisted || !ptyRef.current) return

    resizeTerminal({ force: true })
    focusTerminal()
  })

  const handleTerminalUnmount = useEffectEvent(() => {
    startGenerationRef.current += 1
    isStartingRef.current = false
    clearPendingInput()
    void closeTerminal()
  })

  useEffect(() => {
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('pageshow', handlePageShow)
      handleTerminalUnmount()
    }
  }, [])

  return (
    <>
      <TerminalPanel
        canConfigurePty={allowPtySettings}
        sandboxId={activeSandboxId}
        restartDisabled={restartDisabled}
        restartLabel={restartLabel}
        template={sandboxScoped ? undefined : template}
        terminalContainerRef={terminalContainerRef}
        onFocusTerminal={focusTerminal}
        onCopyTerminalText={() => void copyTerminalText()}
        onConfigurePty={() =>
          dispatchUi({ type: 'setPtySettingsOpen', open: true })
        }
        onRestartTerminal={restartTerminal}
      />

      <PtySettingsDialog
        open={isPtySettingsOpen}
        options={ptyOptions}
        onApply={applyPtyOptions}
        onOpenChange={(open) =>
          dispatchUi({ type: 'setPtySettingsOpen', open })
        }
      />

      <DashboardTerminalCommandDialog
        launch={pendingLaunch}
        onCancel={() => dispatchUi({ type: 'setPendingLaunch', launch: null })}
        onConfirm={confirmPendingLaunch}
      />
    </>
  )
}
