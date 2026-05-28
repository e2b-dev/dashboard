'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import posthog from 'posthog-js'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/primitives/dialog'
import { AddIcon, ArrowRightIcon, CheckIcon } from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'
import {
  isValidTagShape,
  normalizeTagInput,
  TAG_MAX_LENGTH,
  TAG_REGEX,
} from './assign-dialog.helpers'
import BuildPicker, { type BuildSelectionSource } from './build-picker'
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
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      }
    )
  )

  const mutation = useMutation(
    trpc.templates.assignTag.mutationOptions({
      onSuccess: (data, variables) => {
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
        queryClient.invalidateQueries({
          queryKey: trpc.templates.getTagGroups.queryKey({
            teamSlug,
            templateId,
          }),
        })
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
    if (existsQuery.data?.exists) return 'exists'
    return 'available'
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
    // Reset before opening so the dialog mounts with clean state. Don't reset
    // on close — the dialog stays mounted during its exit animation and any
    // visible body swap (e.g. success → idle form) would flicker through.
    if (next && !open) resetState()
    setOpen(next)
  }

  const handleSubmit = (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault()
    if (!canSubmit || !selectedBuildId) return
    const tagToSubmit =
      existsQuery.data?.normalizedTag ?? normalizedDebouncedName
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

  const stage: Stage =
    mutation.status === 'pending'
      ? 'pending'
      : mutation.status === 'error'
        ? 'error'
        : mutation.status === 'success'
          ? 'success'
          : 'idle'

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
        className="sm:max-w-[450px] sm:h-[436px]"
        onPointerDownOutside={(e) => {
          if (stage === 'pending') e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (stage === 'pending') e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>Assign new tag</DialogTitle>
        </DialogHeader>

        {stage === 'success' ? (
          <SuccessBody
            tag={
              existsQuery.data?.normalizedTag ??
              mutation.data?.tags[0] ??
              normalizedDebouncedName
            }
          />
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
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

            {/* Hidden submit so Enter from any input triggers submit if enabled. */}
            <button type="submit" hidden aria-hidden tabIndex={-1} />
          </form>
        )}

        <Footer
          stage={stage}
          canSubmit={canSubmit}
          errorMessage={mutation.error?.message ?? null}
          onSubmit={handleSubmit}
          onCancel={() => handleOpenChange(false)}
          onDismiss={() => handleOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

type Stage = 'idle' | 'pending' | 'error' | 'success'

interface FooterProps {
  stage: Stage
  canSubmit: boolean
  errorMessage: string | null
  onSubmit: () => void
  onCancel: () => void
  onDismiss: () => void
}

function Footer({
  stage,
  canSubmit,
  errorMessage,
  onSubmit,
  onCancel,
  onDismiss,
}: FooterProps) {
  switch (stage) {
    case 'pending':
      return (
        <DialogFooter className="flex-col sm:flex-row">
          <div className="flex w-full items-center justify-center gap-2 py-2">
            <Loader variant="slash" size="sm" />
            <span className="prose-body text-fg-secondary">Assigning…</span>
          </div>
        </DialogFooter>
      )
    case 'error':
      return (
        <DialogFooter className="flex-col gap-3 sm:flex-col">
          {errorMessage ? (
            <p className="prose-body w-full text-accent-error-highlight">
              {errorMessage}
            </p>
          ) : null}
          <div className="grid w-full grid-cols-2 gap-2">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button autoFocus onClick={onSubmit}>
              Retry
            </Button>
          </div>
        </DialogFooter>
      )
    case 'success':
      return (
        <DialogFooter className="mt-auto">
          <Button autoFocus className="w-full" onClick={onDismiss}>
            Dismiss
          </Button>
        </DialogFooter>
      )
    default:
      return (
        <DialogFooter className="grid grid-cols-2 gap-2 sm:flex-row">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={onSubmit}>
            Assign
          </Button>
        </DialogFooter>
      )
  }
}

function SuccessBody({ tag }: { tag: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-accent-positive-bg text-accent-positive-highlight">
        <CheckIcon className="size-6" />
      </span>
      <p className="prose-headline-small text-fg">
        <span className="font-mono">‘{tag}’</span>
        <br />
        assigned successfully
      </p>
    </div>
  )
}

function ArrowDivider() {
  return (
    <div className="flex items-center gap-2">
      <span className="h-px flex-1 bg-stroke" aria-hidden />
      <ArrowRightIcon className="size-4 rotate-90 text-fg-tertiary" />
      <span className="h-px flex-1 bg-stroke" aria-hidden />
    </div>
  )
}

function trackAssign(action: string, properties: Record<string, unknown>) {
  posthog.capture('tag table interacted', {
    action,
    ...properties,
  })
}
