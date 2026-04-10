'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { USER_MESSAGES } from '@/configs/user-messages'
import { useDashboard } from '@/features/dashboard/context'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import { CheckIcon, EditIcon } from '@/ui/primitives/icons'

export const TeamName = () => {
  const { team } = useDashboard()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(team.name)
  const inputRef = useRef<HTMLInputElement>(null)

  const updateNameMutation = useMutation(
    trpc.teams.updateName.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.teams.list.queryKey(),
        })
        toast(defaultSuccessToast(USER_MESSAGES.teamNameUpdated.message))
        setIsEditing(false)
      },
      onError: (error) => {
        toast(
          defaultErrorToast(
            error.message || USER_MESSAGES.failedUpdateTeamName.message
          )
        )
      },
    })
  )

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!name.trim() || name.trim() === team.name) return
    updateNameMutation.mutate({ teamSlug: team.slug, name: name.trim() })
  }

  const handleCancel = () => {
    setName(team.name)
    setIsEditing(false)
  }

  useEffect(() => {
    if (!isEditing) return

    const input = inputRef.current
    if (!input) return

    input.focus()

    const cursorPosition = input.value.length
    input.setSelectionRange(cursorPosition, cursorPosition)
  }, [isEditing])

  const handleStartEditing = () => {
    setName(team.name)
    setIsEditing(true)
  }

  return (
    <div className="flex items-end justify-between gap-4">
      <form
        onSubmit={handleSubmit}
        className="flex min-w-0 flex-1 flex-col gap-1"
      >
        <span className="text-fg-tertiary text-xs leading-[17px] font-normal uppercase">
          name
        </span>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          readOnly={!isEditing}
          className="w-full bg-transparent p-0 text-[32px] leading-8 font-semibold tracking-[-0.32px] text-fg caret-accent-main-highlight outline-none"
        />
      </form>
      <div className="flex shrink-0 items-center gap-2 self-end">
        {isEditing ? (
          <>
            <Button type="button" variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              onClick={() => handleSubmit()}
              loading={updateNameMutation.isPending}
              disabled={!name.trim() || name.trim() === team.name}
            >
              <CheckIcon className="size-6 shrink-0" />
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="icon"
            className="size-9"
            onClick={handleStartEditing}
          >
            <EditIcon className="size-4 shrink-0" />
          </Button>
        )}
      </div>
    </div>
  )
}
