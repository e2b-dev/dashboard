'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CellContext } from '@tanstack/react-table'
import { Check, Copy, Lock, LockOpen, MoreVertical, Plus, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useClipboard } from '@/lib/hooks/use-clipboard'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import { formatLocalLogStyleTimestamp } from '@/lib/utils/formatting'
import { isVersionCompatible } from '@/lib/utils/version'
import { useTRPC } from '@/trpc/client'
import type { DefaultTemplate, Template } from '@/types/api.types'
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
import { Input } from '@/ui/primitives/input'
import { Loader } from '@/ui/primitives/loader_d'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/ui/primitives/popover'
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
    useRouteParams<'/dashboard/[teamIdOrSlug]/templates'>()

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
}: CellContext<Template | DefaultTemplate, unknown>) {
  const names = row.original.names

  // Prefer a name without "/" as the primary display name
  const primaryName = names.find((name) => !name.includes('/')) ?? names[0]
  const additionalNames = names.filter((name) => name !== primaryName)

  const [wasCopied, copy] = useClipboard(2000)
  const nameValue = (primaryName as string) ?? '--'

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (nameValue !== '--') {
      copy(nameValue)
    }
  }

  return (
    <div
      onClick={handleCopy}
      className={cn(
        'flex items-center gap-2 prose-body min-w-0 relative group/name w-full h-9',
        {
          'text-fg-tertiary': !primaryName,
          'cursor-pointer': nameValue !== '--',
        }
      )}
    >
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
      {'isDefault' in row.original && row.original.isDefault && (
        <E2BTemplateBadge />
      )}
      {nameValue !== '--' && (
        <div
          className={cn(
            'absolute right-0 p-1.5 rounded bg-bg pointer-events-none',
            'opacity-0 group-hover/name:opacity-100'
          )}
          aria-hidden="true"
        >
          {wasCopied ? (
            <Check className="size-3 text-icon" />
          ) : (
            <Copy className="size-3 text-icon-secondary" />
          )}
        </div>
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
      {!isPublic && <Lock className="size-3 text-fg-tertiary" />}
      {isPublic ? 'Public' : 'Internal'}
    </Badge>
  )
}

export function TagsCell({
  row,
}: CellContext<Template | DefaultTemplate, unknown>) {
  const template = row.original
  const tags = template.tags ?? []
  const isDefault = 'isDefault' in template
  const { team } = useDashboard()
  const { teamIdOrSlug } =
    useRouteParams<'/dashboard/[teamIdOrSlug]/templates'>()

  const { toast } = useToast()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [newTag, setNewTag] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const templateName = template.aliases[0] || template.names[0]

  const assignTagsMutation = useMutation(
    trpc.templates.assignTags.mutationOptions({
      onSuccess: async (data) => {
        toast(
          defaultSuccessToast(
            <>
              Tags updated for{' '}
              <span className="prose-body-highlight">{templateName}</span>.
            </>
          )
        )

        await queryClient.cancelQueries({
          queryKey: trpc.templates.getTemplates.queryKey({ teamIdOrSlug }),
        })

        queryClient.setQueryData(
          trpc.templates.getTemplates.queryKey({ teamIdOrSlug }),
          (old) => {
            if (!old?.templates) return old
            return {
              ...old,
              templates: old.templates.map((t: Template) =>
                t.templateID === template.templateID
                  ? { ...t, tags: data.tags }
                  : t
              ),
            }
          }
        )
      },
      onError: (error) => {
        toast(defaultErrorToast(error.message || 'Failed to assign tag.'))
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.templates.getTemplates.queryKey({ teamIdOrSlug }),
        })
      },
    })
  )

  const removeTagsMutation = useMutation(
    trpc.templates.removeTags.mutationOptions({
      onSuccess: async (_, variables) => {
        toast(
          defaultSuccessToast(
            <>
              Tag{' '}
              <span className="prose-body-highlight">
                {variables.tags[0]}
              </span>{' '}
              removed from{' '}
              <span className="prose-body-highlight">{templateName}</span>.
            </>
          )
        )

        await queryClient.cancelQueries({
          queryKey: trpc.templates.getTemplates.queryKey({ teamIdOrSlug }),
        })

        queryClient.setQueryData(
          trpc.templates.getTemplates.queryKey({ teamIdOrSlug }),
          (old) => {
            if (!old?.templates) return old
            return {
              ...old,
              templates: old.templates.map((t: Template) =>
                t.templateID === template.templateID
                  ? {
                      ...t,
                      tags: t.tags.filter(
                        (tag) => !variables.tags.includes(tag)
                      ),
                    }
                  : t
              ),
            }
          }
        )
      },
      onError: (error) => {
        toast(defaultErrorToast(error.message || 'Failed to remove tag.'))
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.templates.getTemplates.queryKey({ teamIdOrSlug }),
        })
      },
    })
  )

  const handleAddTag = () => {
    const tag = newTag.trim()
    if (!tag || !templateName) return

    assignTagsMutation.mutate({
      teamIdOrSlug: team.slug ?? team.id,
      target: `${templateName}:${tag}`,
      tags: [tag],
    })
    setNewTag('')
    inputRef.current?.focus()
  }

  const handleRemoveTag = (tag: string) => {
    if (!templateName) return

    removeTagsMutation.mutate({
      teamIdOrSlug: team.slug ?? team.id,
      name: templateName,
      tags: [tag],
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const isMutating =
    assignTagsMutation.isPending || removeTagsMutation.isPending

  return (
    <div className="flex items-center gap-1 min-w-0 overflow-hidden">
      {tags.length > 0 ? (
        <>
          <Badge variant="code" size="sm" className="shrink-0">
            {tags[0]}
          </Badge>
          {tags.length > 1 && (
            <HelpTooltip
              trigger={
                <span className="text-fg-tertiary bg-bg-muted rounded px-1.5 py-0.5 text-xs font-medium shrink-0">
                  +{tags.length - 1}
                </span>
              }
            >
              <div className="flex flex-col gap-1">
                <span className="text-fg-secondary text-xs">All tags:</span>
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="code" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </HelpTooltip>
          )}
        </>
      ) : (
        <span className="text-fg-tertiary text-xs">--</span>
      )}

      {!isDefault && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-fg-tertiary size-5 shrink-0 opacity-0 group-hover/row:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <Plus className="size-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-64 p-3"
            align="start"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-3">
              <span className="text-xs font-medium text-fg-secondary uppercase">
                Manage Tags
              </span>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="code"
                      size="sm"
                      className="gap-1 pr-0.5"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        disabled={isMutating}
                        className="hover:text-accent-error-highlight p-0.5 rounded-sm transition-colors"
                      >
                        <X className="size-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <Input
                  ref={inputRef}
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add tag..."
                  className="h-7 text-xs"
                  disabled={isMutating}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddTag}
                  disabled={!newTag.trim() || isMutating}
                  className="h-7 shrink-0"
                >
                  {isMutating ? (
                    <Loader className="size-3" />
                  ) : (
                    <Plus className="size-3" />
                  )}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
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
