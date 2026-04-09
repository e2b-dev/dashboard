'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useAction } from 'next-safe-action/hooks'
import { useEffect, useRef, useState } from 'react'
import { USER_MESSAGES } from '@/configs/user-messages'
import { updateTeamNameAction } from '@/core/server/actions/team-actions'
import { useDashboard } from '@/features/dashboard/context'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import { CheckIcon, EditIcon } from '@/ui/primitives/icons'

const NAME_INPUT_CLASS =
  'w-full bg-transparent p-0 text-[32px] leading-8 font-semibold tracking-[-0.32px] text-fg caret-accent-main-highlight outline-none'
const NAME_ACTION_ICON_CLASS = 'size-4 shrink-0'

export const TeamName = () => {
  const { team } = useDashboard()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(team.name)
  const inputRef = useRef<HTMLInputElement>(null)

  const { execute, isExecuting } = useAction(updateTeamNameAction, {
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: trpc.teams.list.queryKey(),
      })
      toast(defaultSuccessToast(USER_MESSAGES.teamNameUpdated.message))
      setIsEditing(false)
    },
    onError: ({ error }) => {
      toast(
        defaultErrorToast(
          error.serverError || USER_MESSAGES.failedUpdateTeamName.message
        )
      )
    },
  })

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!name.trim() || name.trim() === team.name) return
    execute({ teamSlug: team.slug, name: name.trim() })
  }

  const handleCancel = () => {
    setName(team.name)
    setIsEditing(false)
  }

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
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
          className={NAME_INPUT_CLASS}
        />
      </form>
      <div className="flex shrink-0 items-center gap-3 self-end">
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={handleCancel}
              className="text-fg-tertiary cursor-pointer text-sm leading-5 font-medium"
            >
              Cancel
            </button>
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              onClick={() => handleSubmit()}
              loading={isExecuting}
              disabled={!name.trim() || name.trim() === team.name}
            >
              <CheckIcon className={NAME_ACTION_ICON_CLASS} />
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="icon"
            className="size-9"
            onClick={handleStartEditing}
          >
            <EditIcon className={NAME_ACTION_ICON_CLASS} />
          </Button>
        )}
      </div>
    </div>
  )
}
