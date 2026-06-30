'use client'

import { useEffect, useId, useState } from 'react'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/primitives/dialog'
import { WarningIcon } from '@/ui/primitives/icons'
import { Textarea } from '@/ui/primitives/textarea'
import type { PendingTerminalLaunch } from './types'

interface DashboardTerminalCommandDialogProps {
  launch: PendingTerminalLaunch | null
  onCancel: () => void
  onConfirm: (command?: string) => void
}

export default function DashboardTerminalCommandDialog({
  launch,
  onCancel,
  onConfirm,
}: DashboardTerminalCommandDialogProps) {
  const commandInputId = useId()
  const [command, setCommand] = useState('')
  const hasCommand = !!launch?.command?.trim()
  const normalizedCommand = command.trim()

  useEffect(() => {
    setCommand(launch?.command ?? '')
  }, [launch])

  return (
    <Dialog open={!!launch} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent hideClose className="sm:max-w-xl">
        <DialogHeader>
          <div className="mb-1 flex size-9 items-center justify-center border bg-bg">
            <WarningIcon className="size-5 text-icon-tertiary" />
          </div>
          <DialogTitle>
            {hasCommand ? 'Review terminal command' : 'Review terminal launch'}
          </DialogTitle>
          <DialogDescription>
            {hasCommand
              ? 'This command will run inside a persistent E2B sandbox after the terminal opens.'
              : 'This terminal will open with the connection settings from the URL.'}
          </DialogDescription>
        </DialogHeader>

        {launch ? (
          <div className="space-y-3">
            {launch.target?.sandboxId ? (
              <div className="space-y-1">
                <p className="prose-label text-fg-tertiary">Sandbox</p>
                <code className="block border bg-bg px-3 py-2 font-mono text-xs text-fg">
                  {launch.target.sandboxId}
                </code>
              </div>
            ) : null}
            <div className="space-y-1">
              <p className="prose-label text-fg-tertiary">Template</p>
              <code className="block border bg-bg px-3 py-2 font-mono text-xs text-fg">
                {launch.target?.template ?? 'base'}
              </code>
            </div>
            {launch.target?.ptyOptions?.user ? (
              <div className="space-y-1">
                <p className="prose-label text-fg-tertiary">User</p>
                <code className="block border bg-bg px-3 py-2 font-mono text-xs text-fg">
                  {launch.target.ptyOptions.user}
                </code>
              </div>
            ) : null}
            {launch.target?.ptyOptions?.cwd ? (
              <div className="space-y-1">
                <p className="prose-label text-fg-tertiary">
                  Working directory
                </p>
                <code className="block border bg-bg px-3 py-2 font-mono text-xs text-fg">
                  {launch.target.ptyOptions.cwd}
                </code>
              </div>
            ) : null}
            {launch.target?.ptyOptions?.envs ? (
              <div className="space-y-1">
                <p className="prose-label text-fg-tertiary">Environment</p>
                <code className="block max-h-32 overflow-auto whitespace-pre-wrap border bg-bg px-3 py-2 font-mono text-xs text-fg">
                  {Object.entries(launch.target.ptyOptions.envs)
                    .map(([key, value]) => `${key}=${value}`)
                    .join('\n')}
                </code>
              </div>
            ) : null}
            {hasCommand ? (
              <div className="space-y-1">
                <label
                  className="prose-label text-fg-tertiary"
                  htmlFor={commandInputId}
                >
                  Command
                </label>
                <Textarea
                  className="max-h-48 min-h-24 font-mono text-xs"
                  id={commandInputId}
                  onChange={(event) => setCommand(event.target.value)}
                  spellCheck={false}
                  value={command}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={hasCommand && !normalizedCommand}
            onClick={() => onConfirm(hasCommand ? normalizedCommand : undefined)}
          >
            {hasCommand ? 'Run command' : 'Start terminal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
