'use client'

import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import { isVersionCompatible } from '@/lib/utils/version'
import { useTRPC } from '@/trpc/client'
import { DefaultTemplate, Template } from '@/types/api.types'
import { AlertDialog } from '@/ui/alert-dialog'
import { E2BBadge } from '@/ui/brand'
import HelpTooltip from '@/ui/help-tooltip'
import { Badge } from '@/ui/primitives/badge'
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
import { Loader } from '@/ui/primitives/loader_d'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CellContext } from '@tanstack/react-table'
import { Lock, LockOpen, MoreVertical } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import ResourceUsage from '../../common/resource-usage'
import { useDashboard } from '../../context'

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
  const { team } = useDashboard()
  const { teamIdOrSlug } =
    useParams<
      Awaited<PageProps<'/dashboard/[teamIdOrSlug]/templates'>['params']>
    >()

  const { toast } = useToast()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const updateTemplateMutation = useMutation(
    trpc.templates.updateTemplate.mutationOptions({
      onSuccess: async (data, variables) => {
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

        await queryClient.cancelQueries({
          queryKey: trpc.templates.getTemplates.queryKey({
            teamIdOrSlug,
          }),
        })

        queryClient.setQueryData(
          trpc.templates.getTemplates.queryKey({
            teamIdOrSlug,
          }),
          (old) => {
            if (!old?.templates) return old

            return {
              ...old,
              templates: old.templates.map((t: Template) =>
                t.templateID === variables.templateId
                  ? { ...t, public: variables.public }
                  : t
              ),
            }
          }
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
        queryClient.invalidateQueries({
          queryKey: trpc.templates.getTemplates.queryKey({
            teamIdOrSlug,
          }),
        })
      },
    })
  )

  const deleteTemplateMutation = useMutation(
    trpc.templates.deleteTemplate.mutationOptions({
      onSuccess: async (_, variables) => {
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

        // stop ongoing invlaidations and remove template from state while refetch is going in the background

        await queryClient.cancelQueries({
          queryKey: trpc.templates.getTemplates.queryKey({
            teamIdOrSlug,
          }),
        })

        queryClient.setQueryData(
          trpc.templates.getTemplates.queryKey({
            teamIdOrSlug,
          }),

          (old) => {
            if (!old?.templates) return old
            return {
              ...old,
              templates: old.templates.filter(
                (t: Template) => t.templateID !== variables.templateId
              ),
            }
          }
        )
      },
      onError: (error, _variables) => {
        const templateName = template.aliases[0] || template.templateID
        toast(
          defaultErrorToast(
            error.message || `Failed to delete template ${templateName}.`
          )
        )
      },
      onSettled: () => {
        setIsDeleteDialogOpen(false)

        queryClient.invalidateQueries({
          queryKey: trpc.templates.getTemplates.queryKey({
            teamIdOrSlug,
          }),
        })
      },
    })
  )

  const isUpdating = updateTemplateMutation.isPending
  const isDeleting = deleteTemplateMutation.isPending

  const togglePublish = () => {
    updateTemplateMutation.mutate({
      teamIdOrSlug: team.slug ?? team.id,
      templateId: template.templateID,
      public: !template.public,
    })
  }

  const deleteTemplate = () => {
    deleteTemplateMutation.mutate({
      teamIdOrSlug: team.slug ?? team.id,
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
                  Set Internal
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
    <div className="overflow-x-hidden whitespace-nowrap text-fg-tertiary font-mono prose-table-numeric">
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
        'flex items-center gap-2 prose-body min-w-0',
        {
          'text-fg-tertiary': !getValue(),
        }
      )}
    >
      <span className="truncate">{(getValue() as string) ?? '--'}</span>
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
  return (
    <div className="w-full flex justify-end">
      <ResourceUsage type="cpu" total={cpuCount} mode="simple" />
    </div>
  )
}

export function MemoryCell({
  row,
}: CellContext<Template | DefaultTemplate, unknown>) {
  const memoryMB = row.getValue('memoryMB') as number
  return (
    <div className="w-full flex justify-end">
      <ResourceUsage type="mem" total={memoryMB} mode="simple" />
    </div>
  )
}

export function CreatedAtCell({
  getValue,
}: CellContext<Template | DefaultTemplate, unknown>) {
  const dateValue = getValue() as string

  const [datePart, timePart] = useMemo(() => {
    const date = new Date(dateValue)
    const isoDate = date.toISOString().split('T')[0] // YYYY-MM-DD
    const isoTime = date.toISOString().split('T')[1].slice(0, 5) // HH:MM
    return [isoDate, isoTime]
  }, [dateValue])

  return (
    <div className={cn('h-full overflow-x-hidden whitespace-nowrap font-mono prose-table-numeric')}>
      <span className="text-fg-secondary">{datePart}</span>{' '}
      <span className="text-fg-tertiary">{timePart}</span>{' '}
      <span className="text-fg-tertiary">UTC</span>
    </div>
  )
}

export function UpdatedAtCell({
  getValue,
}: CellContext<Template | DefaultTemplate, unknown>) {
  const dateValue = getValue() as string

  const [datePart, timePart] = useMemo(() => {
    const date = new Date(dateValue)
    const isoDate = date.toISOString().split('T')[0] // YYYY-MM-DD
    const isoTime = date.toISOString().split('T')[1].slice(0, 5) // HH:MM
    return [isoDate, isoTime]
  }, [dateValue])

  return (
    <div className={cn('h-full overflow-x-hidden whitespace-nowrap font-mono prose-table-numeric')}>
      <span className="text-fg-secondary">{datePart}</span>{' '}
      <span className="text-fg-tertiary">{timePart}</span>{' '}
      <span className="text-fg-tertiary">UTC</span>
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
      {!isPublic && <Lock className="size-3 text-fg-tertiary" />}
      {isPublic ? 'Public' : 'Internal'}
    </Badge>
  )
}

const INVALID_ENVD_VERSION = '0.0.1'
const SDK_V2_MINIMAL_ENVD_VERSION = '0.2.0'

export function EnvdVersionCell({
  getValue,
}: CellContext<Template | DefaultTemplate, unknown>) {
  const valueString = getValue() as string
  const versionValue =
    valueString && valueString !== INVALID_ENVD_VERSION ? valueString : null

  const isNotV2Compatible = versionValue
    ? isVersionCompatible(versionValue, SDK_V2_MINIMAL_ENVD_VERSION) === false
    : false
  return (
    <div
      className={cn(
        'text-fg-tertiary whitespace-nowrap font-mono flex flex-row gap-1.5',
        {
          'text-accent-error-highlight': isNotV2Compatible,
        }
      )}
    >
      {versionValue ?? '--'}
      {isNotV2Compatible && (
        <HelpTooltip>
          The envd version is not compatible with the SDK v2. To update the envd
          version, you need to rebuild the template.
        </HelpTooltip>
      )}
    </div>
  )
}
