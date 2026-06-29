'use client'

import { useQuery } from '@tanstack/react-query'
import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
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
import {
  TagDialogFooter,
  TagDialogStageTransition,
  TagDialogSuccess,
} from './components'
import {
  isValidTagShape,
  normalizeTagInput,
  TAG_MAX_LENGTH,
  TAG_REGEX,
} from './helpers'
import { trackTagTableInteraction } from './table-config'
import TagNameField, { type TagNameStatus } from './tag-name-field'
import { useTagAssignmentMutation } from './use-tag-assignment-mutation'

const NAME_DEBOUNCE_MS = 350

interface AssignTagDialogProps {
  teamSlug: string
  templateId: string
  templateName: string
}

export default function AssignTagDialog(props: AssignTagDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const isPendingRef = useRef(false)
  isPendingRef.current = isPending

  const handleOpenChange = (next: boolean) => {
    if (!next && isPendingRef.current) return
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="primary">
          <AddIcon />
          Assign new tag
        </Button>
      </DialogTrigger>

      <DialogContent
        hideClose={isPending}
        className="sm:max-w-[440px] sm:h-[422px] flex flex-col"
        onPointerDownOutside={(e) => {
          if (isPendingRef.current) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (isPendingRef.current) e.preventDefault()
        }}
      >
        <AssignTagDialogBody
          {...props}
          open={open}
          onClose={() => setOpen(false)}
          onPendingChange={setIsPending}
        />
      </DialogContent>
    </Dialog>
  )
}

interface AssignTagDialogBodyProps extends AssignTagDialogProps {
  open: boolean
  onClose: () => void
  onPendingChange: (pending: boolean) => void
}

function AssignTagDialogBody({
  open,
  teamSlug,
  templateId,
  templateName,
  onClose,
  onPendingChange,
}: AssignTagDialogBodyProps) {
  const trpc = useTRPC()
  const formId = useId()

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

  const { mutation, stage } = useTagAssignmentMutation({
    teamSlug,
    templateId,
    operation: 'assign',
  })

  useEffect(() => {
    onPendingChange(mutation.isPending)
  }, [mutation.isPending, onPendingChange])

  useEffect(() => {
    trackTagTableInteraction('assign opened', { template_id: templateId })
  }, [templateId])

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

  const nameStatus = computeNameStatus()

  function computeNameStatus(): TagNameStatus {
    if (name.trim() === '') return 'idle'
    if (name.length > TAG_MAX_LENGTH || !TAG_REGEX.test(name)) return 'invalid'
    if (name !== normalizedDebouncedName) return 'checking'
    if (!hasValidShape) return 'invalid'
    if (existsQuery.isFetching) return 'checking'

    const data = existsQuery.data
    if (!data || data.normalizedTag !== normalizedDebouncedName)
      return 'checking'

    return data.exists ? 'exists' : 'available'
  }

  const canSubmit =
    nameStatus === 'available' &&
    selectedBuildId !== null &&
    !mutation.isPending

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
    trackTagTableInteraction('assign submitted', {
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

  const successTag =
    existsQuery.data?.normalizedTag ??
    mutation.data?.tags[0] ??
    normalizedDebouncedName

  return (
    <TagDialogStageTransition
      phase={stage === 'success' ? 'success' : 'form'}
      className="gap-4"
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
        onCancel={onClose}
        onDismiss={onClose}
      />
    </TagDialogStageTransition>
  )
}
