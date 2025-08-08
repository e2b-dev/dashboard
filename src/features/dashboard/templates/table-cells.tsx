'use client'

import { useSelectedTeam } from '@/lib/hooks/use-teams'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  deleteTemplateAction,
  updateTemplateAction,
} from '@/server/templates/templates-actions'
import { DefaultTemplate, Template } from '@/types/api'
import { AlertDialog } from '@/ui/alert-dialog'
import { E2BBadge } from '@/ui/brand'
import HelpTooltip from '@/ui/help-tooltip'
import { Button } from '@/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { Loader } from '@/ui/primitives/loader'
import { CellContext } from '@tanstack/react-table'
import { Lock, LockOpen, MoreVertical } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useMemo, useState } from 'react'
import ResourceUsage from '../common/resource-usage'

function E2BTemplateBadge() {
  return (
    <HelpTooltip trigger={<E2BBadge />}>
      <p className="text-fg-secondary font-sans text-xs whitespace-break-spaces">
        This template was created by E2B. It is one of the default templates
        every user has access to.
      </p>
    </HelpTooltip>
  )
}

export function ActionsCell({
  row,
}: CellContext<Template | DefaultTemplate, unknown>) {
  const template = row.original
  const selectedTeam = useSelectedTeam()
  const { toast } = useToast()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const { execute: executeUpdateTemplate, isExecuting: isUpdating } = useAction(
    updateTemplateAction,
    {
      onSuccess: ({ input }) => {
        toast(
          defaultSuccessToast(
            `Template is now ${input.props.Public ? 'public' : 'private'}.`
          )
        )
      },
      onError: (error) => {
        toast(
          defaultErrorToast(
            error.error.serverError || 'Failed to update template.'
          )
        )
      },
    }
  )

  const { execute: executeDeleteTemplate, isExecuting: isDeleting } = useAction(
    deleteTemplateAction,
    {
      onSuccess: () => {
        toast(defaultSuccessToast('Template has been deleted.'))
      },
      onError: (error) => {
        toast(
          defaultErrorToast(
            error.error.serverError || 'Failed to delete template.'
          )
        )
      },
      onSettled: () => {
        setIsDeleteDialogOpen(false)
      },
    }
  )

  const togglePublish = async () => {
    if (!selectedTeam) {
      return
    }

    executeUpdateTemplate({
      templateId: template.templateID,
      props: {
        Public: !template.public,
      },
    })
  }

  const deleteTemplate = async () => {
    if (!selectedTeam) {
      return
    }

    executeDeleteTemplate({
      templateId: template.templateID,
    })
  }

  return (
    <>
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Template"
        description="Are you sure you want to delete this template? This action cannot be undone."
        confirm="Delete"
        onConfirm={() => deleteTemplate()}
        confirmProps={{
          disabled: isDeleting,
          loading: isDeleting,
        }}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-fg-tertiary size-5"
            disabled={isUpdating || isDeleting || 'isDefault' in template}
          >
            {isUpdating ? (
              <Loader className="size-4" />
            ) : (
              <MoreVertical className="size-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>General</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={togglePublish}
              disabled={isUpdating || isDeleting}
            >
              {template.public ? (
                <>
                  <Lock className="!size-3" />
                  Set Private
                </>
              ) : (
                <>
                  <LockOpen className="!size-3" />
                  Set Public
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuLabel>Danger Zone</DropdownMenuLabel>
            <DropdownMenuItem
              variant="error"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isUpdating || isDeleting}
            >
              X Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

export function TemplateIdCell({
  row,
}: CellContext<Template | DefaultTemplate, unknown>) {
  return (
    <div className="overflow-x-hidden whitespace-nowrap text-fg-tertiary">
      {row.getValue('templateID')}
    </div>
  )
}

export function TemplateNameCell({
  row,
  getValue,
}: CellContext<Template | DefaultTemplate, unknown>) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 overflow-x-hidden whitespace-nowrap',
        {
          'text-fg-tertiary': !getValue(),
        }
      )}
    >
      <span>{(getValue() as string) ?? 'N/A'}</span>
      {'isDefault' in row.original && row.original.isDefault && (
        <E2BTemplateBadge />
      )}
    </div>
  )
}

export function CpuCell({
  row,
}: CellContext<Template | DefaultTemplate, unknown>) {
  const cpuCount = row.getValue('cpuCount') as number
  return <ResourceUsage type="cpu" total={cpuCount} mode="simple" />
}

export function MemoryCell({
  row,
}: CellContext<Template | DefaultTemplate, unknown>) {
  const memoryMB = row.getValue('memoryMB') as number
  return <ResourceUsage type="mem" total={memoryMB} mode="simple" />
}

export function CreatedAtCell({
  getValue,
}: CellContext<Template | DefaultTemplate, unknown>) {
  const dateValue = getValue() as string

  const dateTimeString = useMemo(() => {
    return new Date(dateValue).toUTCString()
  }, [dateValue])

  const [day, date, month, year, time, timezone] = useMemo(() => {
    return dateTimeString.split(' ')
  }, [dateTimeString])

  return (
    <div className={cn('h-full overflow-x-hidden whitespace-nowrap font-mono')}>
      <span className="text-fg-tertiary">{`${day} ${date} ${month} ${year}`}</span>{' '}
      <span className="text-fg">{time}</span>{' '}
      <span className="text-fg-tertiary">{timezone}</span>
    </div>
  )
}

export function UpdatedAtCell({
  getValue,
}: CellContext<Template | DefaultTemplate, unknown>) {
  const dateValue = getValue() as string

  const dateTimeString = useMemo(() => {
    return new Date(dateValue).toUTCString()
  }, [dateValue])

  const [day, date, month, year, time, timezone] = useMemo(() => {
    return dateTimeString.split(' ')
  }, [dateTimeString])

  return (
    <div className={cn('h-full overflow-x-hidden whitespace-nowrap font-mono')}>
      <span className="text-fg-tertiary">{`${day} ${date} ${month} ${year}`}</span>{' '}
      <span className="text-fg">{time}</span>{' '}
      <span className="text-fg-tertiary">{timezone}</span>
    </div>
  )
}

export function VisibilityCell({
  getValue,
}: CellContext<Template | DefaultTemplate, unknown>) {
  return (
    <span
      className={cn('text-fg-tertiary whitespace-nowrap font-mono', {
        'text-accent-positive-highlight': getValue(),
      })}
    >
      {getValue() ? 'Public' : 'Private'}
    </span>
  )
}
