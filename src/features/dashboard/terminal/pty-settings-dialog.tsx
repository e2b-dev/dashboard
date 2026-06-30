'use client'

import { useId, useState } from 'react'
import { Button } from '@/ui/primitives/button'
import { Checkbox } from '@/ui/primitives/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/primitives/dialog'
import { Input } from '@/ui/primitives/input'
import { Textarea } from '@/ui/primitives/textarea'
import {
  formatEnvVars,
  parseEnvVars,
  type TerminalPtyOptions,
} from './pty-options'

interface PtySettingsDialogProps {
  open: boolean
  options: TerminalPtyOptions
  onApply: (
    options: TerminalPtyOptions,
    settings: { makeDefault: boolean }
  ) => void
  onOpenChange: (open: boolean) => void
}

export default function PtySettingsDialog({
  open,
  options,
  onApply,
  onOpenChange,
}: PtySettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>PTY settings</DialogTitle>
          <DialogDescription className="sr-only">
            Applied when the terminal opens a new PTY.
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <PtySettingsForm
            options={options}
            onApply={onApply}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function PtySettingsForm({
  options,
  onApply,
  onOpenChange,
}: Omit<PtySettingsDialogProps, 'open'>) {
  const userId = useId()
  const cwdId = useId()
  const envsId = useId()
  const makeDefaultId = useId()
  const [user, setUser] = useState(options.user ?? '')
  const [cwd, setCwd] = useState(options.cwd ?? '')
  const [envs, setEnvs] = useState(() => formatEnvVars(options.envs))
  const [makeDefault, setMakeDefault] = useState(false)

  const applySettings = () => {
    onApply(
      {
        user,
        cwd,
        envs: parseEnvVars(envs),
      },
      { makeDefault }
    )
    onOpenChange(false)
  }

  return (
    <>
      <div className="grid gap-3">
        <label className="grid gap-1" htmlFor={userId}>
          <span className="prose-label text-fg-tertiary uppercase">User</span>
          <Input
            id={userId}
            value={user}
            placeholder="template default"
            onChange={(event) => setUser(event.target.value)}
          />
        </label>

        <label className="grid gap-1" htmlFor={cwdId}>
          <span className="prose-label text-fg-tertiary uppercase">
            Working directory
          </span>
          <Input
            id={cwdId}
            value={cwd}
            placeholder="user home or template workdir"
            onChange={(event) => setCwd(event.target.value)}
          />
        </label>

        <label className="grid gap-1" htmlFor={envsId}>
          <span className="prose-label text-fg-tertiary uppercase">
            Environment
          </span>
          <Textarea
            id={envsId}
            value={envs}
            placeholder={'NAME=value\nDEBUG=1'}
            className="min-h-24 font-mono text-xs"
            onChange={(event) => setEnvs(event.target.value)}
          />
        </label>

        <label className="flex items-center gap-2" htmlFor={makeDefaultId}>
          <Checkbox
            id={makeDefaultId}
            checked={makeDefault}
            onCheckedChange={(checked) => setMakeDefault(checked === true)}
          />
          <span className="prose-label text-fg-tertiary uppercase">
            Make default
          </span>
        </label>
      </div>

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={applySettings}>
          Apply and reconnect
        </Button>
      </DialogFooter>
    </>
  )
}
