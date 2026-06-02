'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import posthog from 'posthog-js'
import { type FormEvent, useEffect, useId, useMemo, useState } from 'react'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/primitives/dialog'
import { AddIcon } from '@/ui/primitives/icons'
import { ArrowDivider } from './arrow-divider'
import BuildPicker, { type BuildSelectionSource } from './build-picker'
import { TagDialogFooter, TagDialogSuccess } from './components'
import {
  isValidTagShape,
  normalizeTagInput,
  TAG_MAX_LENGTH,
  TAG_REGEX,
  tagDialogStageFromMutation,
} from './helpers'
import TagNameField, { type TagNameStatus } from './tag-name-field'

const NAME_DEBOUNCE_MS = 350

interface AssignTagDialogProps {
  teamSlug: string
  templateId: string
  templateName: string
}

export default function AssignTagDialog({
  teamSlug,
  templateId,
  templateName,
}: AssignTagDialogProps) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const formId = useId()
  const [open, setOpen] = useState(false)
  const [name, setNameRaw] = useState('')
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null)
  const [selectionSource, setSelectionSource] =
    useState<BuildSelectionSource | null>(null)

  const debouncedName = useDebouncedValue(name, NAME_DEBOUNCE_MS)
  const normalizedDebouncedName = debouncedName.trim()
  const hasValidShape = isValidTagShape(normalizedDebouncedName)

  const existsQuery = useQuery(
    trpc.templates.checkTagExists.queryOptions(
      { teamSlug, templateId, tag: normalizedDebouncedName },
      {
        enabled: open && hasValidShape,
        staleTime: 0,
        refetchOnWindowFocus: false,
      }
    )
  )

  const mutation = useMutation(
    trpc.templates.assignTag.mutationOptions({
      onSuccess: async (data, variables) => {
        const persistedTag =
          existsQuery.data?.normalizedTag ?? data.tags[0] ?? variables.tag
        queryClient.setQueryData(
          trpc.templates.checkTagExists.queryKey({
            teamSlug,
            templateId,
            tag: persistedTag,
          }),
          { exists: true, normalizedTag: persistedTag }
        )
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.templates.getTagGroups.infiniteQueryOptions({
              teamSlug,
              templateId,
            }).queryKey,
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.templates.getTagCount.queryOptions({
              teamSlug,
              templateId,
            }).queryKey,
          }),
        ])
        trackAssign('assign succeeded', {})
      },
      onError: (error) => {
        trackAssign('assign failed', {
          error_status: error.data?.httpStatus ?? null,
          error_code: error.data?.code ?? null,
        })
      },
    })
  )

  const setName = (raw: string) => {
    setNameRaw(normalizeTagInput(raw))
    if (mutation.isError) mutation.reset()
  }
  const handleSetSelectedBuildId = (
    id: string | null,
    source: BuildSelectionSource
  ) => {
    setSelectedBuildId(id)
    setSelectionSource(id ? source : null)
    if (mutation.isError) mutation.reset()
  }

  const nameStatus: TagNameStatus = useMemo(() => {
    if (name.trim() === '') return 'idle'
    if (name.length > TAG_MAX_LENGTH || !TAG_REGEX.test(name)) {
      return 'invalid'
    }
    if (name !== normalizedDebouncedName) return 'checking'
    if (!hasValidShape) return 'invalid'
    if (existsQuery.isFetching) return 'checking'

    const data = existsQuery.data
    if (!data || data.normalizedTag !== normalizedDebouncedName) {
      return 'checking'
    }

    return data.exists ? 'exists' : 'available'
  }, [name, normalizedDebouncedName, hasValidShape, existsQuery])

  const canSubmit =
    nameStatus === 'available' &&
    selectedBuildId !== null &&
    !mutation.isPending

  useEffect(() => {
    if (!open) return
    trackAssign('assign opened', { template_id: templateId })
  }, [open, templateId])

  const resetState = () => {
    setNameRaw('')
    setSelectedBuildId(null)
    setSelectionSource(null)
    mutation.reset()
  }

  const handleOpenChange = (next: boolean) => {
    if (mutation.isPending) return
    // Reset on open only; resetting on close would flicker through the exit animation.
    if (next && !open) resetState()
    setOpen(next)
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!canSubmit || !selectedBuildId) return

    const data = existsQuery.data
    if (
      !data ||
      data.normalizedTag !== normalizedDebouncedName ||
      data.exists
    ) {
      return
    }

    const tagToSubmit = data.normalizedTag
    trackAssign('assign submitted', {
      via_search: selectionSource === 'search',
    })
    mutation.mutate({
      teamSlug,
      templateId,
      templateName,
      buildId: selectedBuildId,
      tag: tagToSubmit,
    })
  }

  const stage = tagDialogStageFromMutation(mutation)

  const successTag =
    existsQuery.data?.normalizedTag ??
    mutation.data?.tags[0] ??
    normalizedDebouncedName

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="primary">
          <AddIcon />
          Assign new tag
        </Button>
      </DialogTrigger>

      <DialogContent
        hideClose={stage === 'pending'}
        className="sm:max-w-[430px] sm:h-[422px] gap-4"
        onPointerDownOutside={(e) => {
          if (stage === 'pending') e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (stage === 'pending') e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle className={stage === 'success' ? 'sr-only' : undefined}>
            {stage === 'success'
              ? `‘${successTag}’ assigned successfully`
              : 'Assign new tag'}
          </DialogTitle>
        </DialogHeader>

        {stage === 'success' ? (
          <TagDialogSuccess tag={successTag} message="assigned successfully" />
        ) : (
          <form
            id={formId}
            onSubmit={handleSubmit}
            className="flex flex-col gap-2"
          >
            <TagNameField
              value={name}
              onChange={setName}
              status={nameStatus}
              disabled={stage === 'pending'}
              autoFocus
            />

            <ArrowDivider />

            <div className="flex items-center gap-3 mb-1">
              <span className="prose-label-highlight uppercase text-fg-tertiary">
                Target
              </span>
              <span className="prose-body font-mono text-fg-primary">
                {selectedBuildId ? selectedBuildId : '--'}
              </span>
            </div>

            <BuildPicker
              open={open}
              teamSlug={teamSlug}
              templateId={templateId}
              selectedBuildId={selectedBuildId}
              onSelect={handleSetSelectedBuildId}
              disabled={stage === 'pending'}
            />
          </form>
        )}

        <TagDialogFooter
          stage={stage}
          canSubmit={canSubmit}
          errorMessage={mutation.error?.message ?? null}
          submitLabel="Assign"
          pendingLabel="Assigning"
          formId={formId}
          onCancel={() => handleOpenChange(false)}
          onDismiss={() => handleOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function trackAssign(action: string, properties: Record<string, unknown>) {
  posthog.capture('tag table interacted', {
    action,
    ...properties,
  })
}
