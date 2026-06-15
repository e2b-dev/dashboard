'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CellContext } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import type { DefaultTemplate, Template } from '@/core/modules/templates/models'
import { useTimezone } from '@/features/dashboard/timezone'
import { useClipboard } from '@/lib/hooks/use-clipboard'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import { formatDateParts } from '@/lib/utils/formatting'
import { isVersionCompatible } from '@/lib/utils/version'
import { useTRPC } from '@/trpc/client'
import { AlertDialog } from '@/ui/alert-dialog'
import { E2BBadge } from '@/ui/brand'
import { Badge } from '@/ui/primitives/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { IconButton } from '@/ui/primitives/icon-button'
import {
  CheckmarkIcon,
  CopyIcon,
  IndicatorDotsIcon,
  PrivateIcon,
  UnlockIcon,
} from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/ui/primitives/tooltip'
import { useDashboard } from '../../context'

function E2BTemplateBadge() {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger tabIndex={-1} asChild>
        <E2BBadge className="relative z-10" />
      </TooltipTrigger>
      <TooltipContent className="max-w-[208px] p-2">
        <p className="text-fg-secondary font-sans text-xs">
          Created and managed by E2B. Accessible to everyone.
        </p>
      </TooltipContent>
    </Tooltip>
  )
}

export function ActionsCell({
  row,
}: CellContext<Template | DefaultTemplate, unknown>) {
  const template = row.original
  const { team } = useDashboard()

  const { toast } = useToast()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  // Path-level key matches the paginated infinite query across every
  // sort/filter/search variant currently in the cache.
  const templatesListKey = trpc.templates.getTemplates.pathKey()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const updateTemplateMutation = useMutation(
    trpc.templates.updateTemplate.mutationOptions({
      onSuccess: (data) => {
        const templateName = template.aliases[0] || template.templateID

        toast(
          defaultSuccessToast(
            <>
              Template{' '}
              <span className="prose-body-highlight">{templateName}</span> is
              now {data.public ? 'public' : 'internal'}.
            </>
          )
        )
      },
      onError: (error) => {
        const templateName = template.aliases[0] || template.templateID
        toast(
          defaultErrorToast(
            error.message || `Failed to update template ${templateName}.`
          )
        )
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: templatesListKey })
      },
    })
  )

  const deleteTemplateMutation = useMutation(
    trpc.templates.deleteTemplate.mutationOptions({
      onSuccess: () => {
        const templateName = template.aliases[0] || template.templateID
        toast(
          defaultSuccessToast(
            <>
              Template{' '}
              <span className="prose-body-highlight">{templateName}</span> has
              been deleted.
            </>
          )
        )
      },
      onError: (error) => {
        const templateName = template.aliases[0] || template.templateID
        toast(
          defaultErrorToast(
            error.message || `Failed to delete template ${templateName}.`
          )
        )
      },
      onSettled: () => {
        setIsDeleteDialogOpen(false)
        queryClient.invalidateQueries({ queryKey: templatesListKey })
      },
    })
  )

  const isUpdating = updateTemplateMutation.isPending
  const isDeleting = deleteTemplateMutation.isPending

  const togglePublish = () => {
    updateTemplateMutation.mutate({
      teamSlug: team.slug,
      templateId: template.templateID,
      public: !template.public,
    })
  }

  const deleteTemplate = () => {
    deleteTemplateMutation.mutate({
      teamSlug: team.slug,
      templateId: template.templateID,
    })
  }

  return (
    <>
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Template"
        description={
          <>
            You are about to delete the template{' '}
            {template.aliases[0] && (
              <>
                <span className="prose-body-highlight">
                  {template.aliases[0]}
                </span>{' '}
                (
              </>
            )}
            <code className="text-fg-tertiary font-mono">
              {template.templateID}
            </code>
            {template.aliases[0] && <>)</>}. This action cannot be undone.
          </>
        }
        confirm="Delete"
        onConfirm={() => deleteTemplate()}
        confirmProps={{
          disabled: isDeleting,
          loading: isDeleting ? 'Deleting...' : undefined,
        }}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton
            className="size-5 relative z-10"
            disabled={isUpdating || isDeleting || 'isDefault' in template}
          >
            {isUpdating ? (
              <Loader className="size-4" variant="square" size="lg" />
            ) : (
              <IndicatorDotsIcon />
            )}
          </IconButton>
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
                  <PrivateIcon className="!size-3" />
                  Set Internal
                </>
              ) : (
                <>
                  <UnlockIcon className="!size-3" />
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
    <div className="overflow-x-hidden whitespace-nowrap text-fg-tertiary font-mono prose-table-numeric">
      {row.getValue('templateID')}
    </div>
  )
}

export function TemplateNameCell({
  row,
}: CellContext<Template | DefaultTemplate, unknown>) {
  const template = row.original
  const names = template.names

  // Prefer a name without "/" as the primary display name
  const primaryName = names.find((name) => !name.includes('/')) ?? names[0]
  const additionalNames = names.filter((name) => name !== primaryName)

  const [wasCopied, copy] = useClipboard(2000)
  const nameValue = (primaryName as string) ?? '--'

  const isDefault = 'isDefault' in template && template.isDefault

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (nameValue !== '--') {
      copy(nameValue)
    }
  }

  // Navigation is handled by the row-level overlay link; interactive controls
  // here sit above it via z-10 so they stay clickable.
  return (
    <div
      className={cn(
        'flex items-center gap-2 prose-body min-w-0 relative w-full h-9',
        'group-hover/row:text-fg transition-colors',
        { 'text-fg-tertiary': !primaryName }
      )}
    >
      <span className="truncate">{nameValue}</span>
      {(additionalNames.length > 0 || isDefault) && (
        <div className="flex items-center gap-1">
          {additionalNames.length > 0 && (
            <Tooltip delayDuration={200}>
              <TooltipTrigger tabIndex={-1} asChild>
                <Badge
                  variant="default"
                  size="xs"
                  className="relative z-10 px-0.5 text-fg-tertiary"
                >
                  +{additionalNames.length}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="p-2">
                <div className="flex flex-col gap-1 font-sans">
                  <span className="text-fg-tertiary text-xs">
                    Also available as:
                  </span>
                  <ul className="flex flex-col gap-0.5 list-disc ml-4 mr-2">
                    {additionalNames.map((name) => (
                      <li key={name} className="font-mono text-xs text-fg">
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
          {isDefault && <E2BTemplateBadge />}
        </div>
      )}
      {nameValue !== '--' && (
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'group/copy relative z-10 ml-auto shrink-0 p-1.5 rounded cursor-pointer',
            'opacity-0 group-hover/row:opacity-100',
            'focus-visible:opacity-100 focus-visible:outline-none'
          )}
          aria-label={wasCopied ? 'Copied' : 'Copy template name'}
        >
          {wasCopied ? (
            <CheckmarkIcon className="size-3 text-icon" />
          ) : (
            <CopyIcon className="size-3 text-icon-tertiary group-hover/copy:text-icon" />
          )}
        </button>
      )}
    </div>
  )
}

type DateColumnId = 'createdAt' | 'updatedAt'

function DateTimeCell({
  ctx,
  columnId,
}: {
  ctx: CellContext<Template | DefaultTemplate, unknown>
  columnId: DateColumnId
}) {
  'use no memo'

  const { getValue, table, row } = ctx
  const { timezone } = useTimezone()
  const dateValue = getValue() as string

  const formatted = useMemo(
    () =>
      formatDateParts(dateValue, {
        timezone,
        format: 'date-year-time-no-seconds',
      }),
    [dateValue, timezone]
  )

  const rows = table.getRowModel().rows
  const datePart = formatted?.datePart

  const { isDateEmphasized, isTimeEmphasized } = useMemo(() => {
    if (!datePart) return { isDateEmphasized: false, isTimeEmphasized: false }

    const sharesDate = (index: number) => {
      const neighbor = rows[index]
      if (!neighbor) return false
      const neighborValue = neighbor.getValue(columnId) as string
      return (
        formatDateParts(neighborValue, {
          timezone,
          format: 'date-year-time-no-seconds',
        })?.datePart === datePart
      )
    }

    const sameAsAbove = sharesDate(row.index - 1)
    const sameAsBelow = sharesDate(row.index + 1)

    return {
      isDateEmphasized: !sameAsAbove,
      isTimeEmphasized: sameAsAbove || sameAsBelow,
    }
  }, [datePart, rows, row.index, columnId, timezone])

  return (
    <div
      className={cn(
        'h-full overflow-x-hidden whitespace-nowrap font-mono prose-table-numeric'
      )}
    >
      <span className={isDateEmphasized ? 'text-fg' : 'text-fg-tertiary'}>
        {formatted?.datePart ?? '--'}
      </span>{' '}
      <span className={isTimeEmphasized ? 'text-fg' : 'text-fg-tertiary'}>
        {formatted?.timePart ?? '--'}
      </span>{' '}
      <span className="text-fg-tertiary">{formatted?.timezonePart ?? ''}</span>
    </div>
  )
}

export function CreatedAtCell(
  ctx: CellContext<Template | DefaultTemplate, unknown>
) {
  return <DateTimeCell ctx={ctx} columnId="createdAt" />
}

export function UpdatedAtCell(
  ctx: CellContext<Template | DefaultTemplate, unknown>
) {
  return <DateTimeCell ctx={ctx} columnId="updatedAt" />
}

export function VisibilityCell({
  getValue,
}: CellContext<Template | DefaultTemplate, unknown>) {
  const isPublic = getValue() as boolean
  return (
    <Badge
      variant="default"
      size="sm"
      className={cn('uppercase bg-fill', !isPublic && 'pl-[3px]')}
    >
      {!isPublic && <PrivateIcon className="size-3 text-fg-tertiary" />}
      {isPublic ? 'Public' : 'Internal'}
    </Badge>
  )
}
