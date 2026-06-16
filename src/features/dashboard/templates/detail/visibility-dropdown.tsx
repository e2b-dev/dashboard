'use client'

import {
  type InfiniteData,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import posthog from 'posthog-js'
import type { ListTeamTemplatesResult } from '@/core/modules/templates/models'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils/ui'
import { useTRPC } from '@/trpc/client'
import { Badge } from '@/ui/primitives/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { EditIcon, PrivateIcon, UnlockIcon } from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'

interface TemplateVisibilityDropdownProps {
  teamSlug: string
  templateId: string
  isPublic: boolean
  displayName: string
}

export function TemplateVisibilityDropdown({
  teamSlug,
  templateId,
  isPublic,
  displayName,
}: TemplateVisibilityDropdownProps) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const updateTemplate = useMutation(
    trpc.templates.updateTemplate.mutationOptions({
      onSuccess: async (data, variables) => {
        toast(
          defaultSuccessToast(
            <>
              Template{' '}
              <span className="prose-body-highlight">{displayName}</span> is now{' '}
              {data.public ? 'public' : 'internal'}.
            </>
          )
        )

        posthog.capture('template visibility changed from header', {
          templateId,
          public: variables.public,
        })

        const listKey = trpc.templates.getTemplates.pathKey()
        const detailKey = trpc.templates.getTemplate.queryKey({
          teamSlug,
          templateId,
        })

        await Promise.all([
          queryClient.cancelQueries({ queryKey: listKey }),
          queryClient.cancelQueries({ queryKey: detailKey }),
        ])

        queryClient.setQueriesData<InfiniteData<ListTeamTemplatesResult>>(
          { queryKey: listKey },
          (old) => {
            if (!old?.pages) return old
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                data: page.data.map((t) =>
                  t.templateID === variables.templateId
                    ? { ...t, public: variables.public }
                    : t
                ),
              })),
            }
          }
        )

        queryClient.setQueryData(detailKey, (old) => {
          if (!old?.template) return old
          return {
            ...old,
            template: { ...old.template, public: variables.public },
          }
        })
      },
      onError: (error) => {
        toast(
          defaultErrorToast(
            error.message || `Failed to update template ${displayName}.`
          )
        )
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.templates.getTemplates.pathKey(),
        })
        queryClient.invalidateQueries({
          queryKey: trpc.templates.getTemplate.queryKey({
            teamSlug,
            templateId,
          }),
        })
      },
    })
  )

  const isPending = updateTemplate.isPending

  const togglePublish = () => {
    updateTemplate.mutate({
      teamSlug,
      templateId,
      public: !isPublic,
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isPending}
          className={cn(
            'flex items-center gap-2 group/visibility',
            'cursor-pointer focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-60'
          )}
          aria-label="Change template visibility"
        >
          <Badge
            variant="default"
            size="sm"
            className={cn('uppercase bg-fill', !isPublic && 'pl-[3px]')}
          >
            {!isPublic && <PrivateIcon className="size-3 text-fg-tertiary" />}
            {isPublic ? 'Public' : 'Internal'}
          </Badge>
          <span
            className={cn(
              'text-fg-tertiary opacity-60 transition-opacity',
              'group-hover/visibility:opacity-100',
              'group-focus-visible/visibility:opacity-100'
            )}
            aria-hidden="true"
          >
            {isPending ? (
              <Loader className="size-3" variant="square" />
            ) : (
              <EditIcon className="size-3" />
            )}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={togglePublish} disabled={isPending}>
          {isPublic ? (
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
