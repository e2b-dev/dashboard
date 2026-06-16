'use client'

import Link from 'next/link'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'
import type { AgentTemplateConfig } from '@/configs/agents'
import { PROTECTED_URLS } from '@/configs/urls'
import type { Sandbox } from '@/core/modules/sandboxes/models'
import {
  killSandboxAction,
  pauseSandboxAction,
} from '@/core/server/actions/sandbox-actions'
import { AlertPopover } from '@/ui/alert-popover'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { ExternalLinkIcon, PausedIcon, RemoveIcon } from '@/ui/primitives/icons'
import {
  applySandboxHistoryFilter,
  canReopenTerminal,
  formatStartedAt,
  getStateBadgeVariant,
} from './utils'

function KillAgentSandboxButton({
  sandboxId,
  teamSlug,
  onKilled,
}: {
  sandboxId: string
  teamSlug: string
  onKilled: () => void
}) {
  const [open, setOpen] = useState(false)
  const { execute, isExecuting } = useAction(killSandboxAction, {
    onSuccess: () => {
      toast.success('Sandbox killed successfully')
      setOpen(false)
      onKilled()
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError || 'Failed to kill sandbox. Please try again.'
      )
    },
  })

  return (
    <AlertPopover
      open={open}
      onOpenChange={setOpen}
      title="Kill Sandbox"
      description="Are you sure you want to kill this sandbox? The sandbox state will be lost and cannot be recovered."
      confirm="Kill Sandbox"
      trigger={
        <Button size="none" variant="tertiary">
          <RemoveIcon />
          Kill
        </Button>
      }
      confirmProps={{
        disabled: isExecuting,
        loading: isExecuting ? 'Killing...' : undefined,
      }}
      onConfirm={() => execute({ teamSlug, sandboxId })}
      onCancel={() => setOpen(false)}
    />
  )
}

function PauseAgentSandboxButton({
  disabled,
  sandboxId,
  teamSlug,
  onPaused,
}: {
  disabled?: boolean
  sandboxId: string
  teamSlug: string
  onPaused: () => void
}) {
  const { execute, isExecuting } = useAction(pauseSandboxAction, {
    onSuccess: () => {
      toast.success('Sandbox paused successfully')
      onPaused()
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError || 'Failed to pause sandbox. Please try again.'
      )
    },
  })

  return (
    <Button
      disabled={disabled || isExecuting}
      loading={isExecuting ? 'Pausing...' : undefined}
      size="none"
      title={
        disabled ? 'Pause is not supported by the local harness' : undefined
      }
      variant="tertiary"
      onClick={() => {
        if (disabled) {
          return
        }

        execute({ teamSlug, sandboxId })
      }}
    >
      <PausedIcon />
      Pause
    </Button>
  )
}

export function AgentSessionList({
  canPause,
  onKilled,
  onOpenTerminal,
  onPaused,
  sessions,
  teamSlug,
  template,
}: {
  canPause: boolean
  onKilled: () => void
  onOpenTerminal: (sandboxId: string) => void
  onPaused: () => void
  sessions: Sandbox[]
  teamSlug: string
  template: AgentTemplateConfig
}) {
  if (sessions.length === 0) {
    return (
      <div className="prose-body text-fg-tertiary px-3 py-3">
        No sessions yet
      </div>
    )
  }

  return (
    <div className="divide-stroke divide-y">
      {sessions.map((sandbox) => (
        <div
          className="grid gap-2 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
          key={sandbox.sandboxID}
        >
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <Badge variant={getStateBadgeVariant(sandbox.state)}>
                {sandbox.state}
              </Badge>
              <Link
                className="prose-body text-fg-secondary hover:text-fg min-w-0 truncate font-mono hover:underline"
                href={PROTECTED_URLS.SANDBOX(teamSlug, sandbox.sandboxID)}
              >
                {sandbox.sandboxID}
              </Link>
            </div>
            <div className="prose-label text-fg-tertiary mt-1 truncate uppercase">
              {formatStartedAt(sandbox.startedAt)}
            </div>
          </div>
          {canReopenTerminal(sandbox) ? (
            <div className="flex flex-wrap items-center gap-3 md:justify-end">
              <Button
                size="none"
                variant="tertiary"
                onClick={() => onOpenTerminal(sandbox.sandboxID)}
              >
                Open
                <ExternalLinkIcon />
              </Button>
              {sandbox.state === 'running' ? (
                <PauseAgentSandboxButton
                  disabled={!canPause}
                  onPaused={onPaused}
                  sandboxId={sandbox.sandboxID}
                  teamSlug={teamSlug}
                />
              ) : null}
              <KillAgentSandboxButton
                onKilled={onKilled}
                sandboxId={sandbox.sandboxID}
                teamSlug={teamSlug}
              />
            </div>
          ) : (
            <span className="prose-label text-fg-tertiary uppercase md:text-right">
              Closed
            </span>
          )}
        </div>
      ))}
      <div className="px-3 py-2">
        <Button asChild size="none" variant="tertiary">
          <Link
            href={PROTECTED_URLS.SANDBOXES_LIST(teamSlug)}
            onClick={() => applySandboxHistoryFilter(template)}
          >
            View all sessions
            <ExternalLinkIcon />
          </Link>
        </Button>
      </div>
    </div>
  )
}
