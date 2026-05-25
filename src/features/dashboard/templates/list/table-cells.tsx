'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CellContext } from '@tanstack/react-table'
import Link from 'next/link'
import posthog from 'posthog-js'
import { useMemo, useState } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import type { DefaultTemplate, Template } from '@/core/modules/templates/models'
import { useClipboard } from '@/lib/hooks/use-clipboard'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import { formatLocalLogStyleTimestamp } from '@/lib/utils/formatting'
import { useTRPC } from '@/trpc/client'
import { AlertDialog } from '@/ui/alert-dialog'
import { E2BBadge } from '@/ui/brand'
import HelpTooltip from '@/ui/help-tooltip'
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
import { useDashboard } from '../../context'

function E2BTemplateBadge() {
  return (
    <HelpTooltip
      trigger={<E2BBadge />}
      classNames={{ content: 'max-w-[208px]' }}
    >
      <p className="text-fg-secondary font-sans text-xs whitespace-break-spaces">
        This template was created by&nbsp;E2B. It is one of the default
        templates every user has access to.
      </p>
    </HelpTooltip>
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
            className="size-5"
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
  const { teamSlug } = useRouteParams<'/dashboard/[teamSlug]/templates'>()

  // Prefer a name without "/" as the primary display name
  const primaryName = names.find((name) => !name.includes('/')) ?? names[0]
  const additionalNames = names.filter((name) => name !== primaryName)

  const [wasCopied, copy] = useClipboard(2000)
  const nameValue = (primaryName as string) ?? '--'

  const isDefault = 'isDefault' in template && template.isDefault
  // Default (E2B) templates have no detail page; render as plain text.
  const isLinkable = !isDefault && nameValue !== '--'

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (nameValue !== '--') {
      copy(nameValue)
    }
  }

  const handleNavigate = () => {
    posthog.capture('template detail opened', {
      templateId: template.templateID,
      fromTab: 'list',
    })
  }

  const content = (
    <>
      <span className="truncate">{nameValue}</span>
      {additionalNames.length > 0 && (
        <HelpTooltip
          trigger={
            <span className="text-fg-tertiary bg-bg-muted rounded px-1.5 py-0.5 text-xs font-medium">
              +{additionalNames.length}
            </span>
          }
        >
          <div className="flex flex-col gap-1">
            <span className="text-fg-secondary text-xs">
              Also available under:
            </span>
            <ul className="flex flex-col gap-0.5 list-disc ml-4 mr-2">
              {additionalNames.map((name) => (
                <li key={name} className="font-mono text-xs text-fg-tertiary">
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </HelpTooltip>
      )}
      {isDefault && <E2BTemplateBadge />}
      {nameValue !== '--' && (
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'absolute right-0 p-1.5 rounded bg-bg',
            'opacity-0 group-hover/name:opacity-100',
            'focus-visible:opacity-100 focus-visible:outline-none',
            'hover:bg-bg-hover transition-colors'
          )}
          aria-label={wasCopied ? 'Copied' : 'Copy template name'}
        >
          {wasCopied ? (
            <CheckmarkIcon className="size-3 text-icon" />
          ) : (
            <CopyIcon className="size-3 text-icon-secondary" />
          )}
        </button>
      )}
    </>
  )

  if (isLinkable) {
    return (
      <Link
        href={PROTECTED_URLS.TEMPLATE_OVERVIEW(teamSlug, template.templateID)}
        onClick={handleNavigate}
        className={cn(
          'flex items-center gap-2 prose-body min-w-0 relative group/name w-full h-9',
          'hover:text-fg transition-colors focus-visible:outline-none'
        )}
      >
        {content}
      </Link>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 prose-body min-w-0 relative group/name w-full h-9',
        {
          'text-fg-tertiary': !primaryName,
        }
      )}
    >
      {content}
    </div>
  )
}

export function CreatedAtCell({
  getValue,
}: CellContext<Template | DefaultTemplate, unknown>) {
  const dateValue = getValue() as string

  const formattedTimestamp = useMemo(() => {
    return formatLocalLogStyleTimestamp(dateValue, {
      includeSeconds: false,
      includeYear: true,
    })
  }, [dateValue])

  return (
    <div
      className={cn(
        'h-full overflow-x-hidden whitespace-nowrap font-mono prose-table-numeric'
      )}
    >
      <span className="text-fg-tertiary">
        {formattedTimestamp?.datePart ?? '--'}
      </span>{' '}
      {formattedTimestamp?.timePart ?? '--'}{' '}
      <span className="text-fg-tertiary">
        {formattedTimestamp?.timezonePart ?? ''}
      </span>
    </div>
  )
}

export function UpdatedAtCell({
  getValue,
}: CellContext<Template | DefaultTemplate, unknown>) {
  const dateValue = getValue() as string

  const formattedTimestamp = useMemo(() => {
    return formatLocalLogStyleTimestamp(dateValue, {
      includeSeconds: false,
      includeYear: true,
    })
  }, [dateValue])

  return (
    <div
      className={cn(
        'h-full overflow-x-hidden whitespace-nowrap font-mono prose-table-numeric'
      )}
    >
      <span className="text-fg-tertiary">
        {formattedTimestamp?.datePart ?? '--'}
      </span>{' '}
      {formattedTimestamp?.timePart ?? '--'}{' '}
      <span className="text-fg-tertiary">
        {formattedTimestamp?.timezonePart ?? ''}
      </span>
    </div>
  )
}

export function VisibilityCell({
  getValue,
}: CellContext<Template | DefaultTemplate, unknown>) {
  const isPublic = getValue() as boolean
  return (
    <Badge
      variant="default"
      size="sm"
      className={cn('uppercase bg-fill', !isPublic && 'pl-[3]')}
    >
      {!isPublic && <PrivateIcon className="size-3 text-fg-tertiary" />}
      {isPublic ? 'Public' : 'Internal'}
    </Badge>
  )
}
