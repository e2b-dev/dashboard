'use client'

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
import type { PendingTerminalLaunch } from './types'

interface DashboardTerminalCommandDialogProps {
  launch: PendingTerminalLaunch | null
  onCancel: () => void
  onConfirm: () => void
}

export default function DashboardTerminalCommandDialog({
  launch,
  onCancel,
  onConfirm,
}: DashboardTerminalCommandDialogProps) {
  return (
    <Dialog open={!!launch} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent hideClose className="sm:max-w-xl">
        <DialogHeader>
          <div className="mb-1 flex size-9 items-center justify-center border bg-bg">
            <WarningIcon className="size-5 text-icon-tertiary" />
          </div>
          <DialogTitle>Review terminal command</DialogTitle>
          <DialogDescription>
            This command will run inside a persistent E2B sandbox after the
            terminal opens.
          </DialogDescription>
        </DialogHeader>

        {launch ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="prose-label text-fg-tertiary">Template</p>
              <code className="block border bg-bg px-3 py-2 font-mono text-xs text-fg">
                {launch.template}
              </code>
            </div>
            <div className="space-y-1">
              <p className="prose-label text-fg-tertiary">Command</p>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words border bg-bg p-3 font-mono text-xs text-fg">
                <code>{launch.command}</code>
              </pre>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm}>
            Run command
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
