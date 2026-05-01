'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import { USER_MESSAGES } from '@/configs/user-messages'
import { TEAM_NAME_MAX_LENGTH } from '@/core/modules/teams/schemas'
import { useDashboard } from '@/features/dashboard/context'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { getTRPCValidationMessages } from '@/lib/utils/trpc-errors'
import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import { IconButton } from '@/ui/primitives/icon-button'
import { CheckIcon, EditIcon } from '@/ui/primitives/icons'
import { Label } from '@/ui/primitives/label'
import { Loader } from '@/ui/primitives/loader'

const getValidationToastContent = (messages: string[]): ReactNode =>
  messages.length === 1 ? (
    messages[0]
  ) : (
    <ul className="list-disc space-y-1 pl-4">
      {messages.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  )

export const TeamName = (): ReactElement => {
  const { team } = useDashboard()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(team.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const trimmedName = name.trim()
  const isSaveDisabled = !trimmedName || trimmedName === team.name

  const updateNameMutation = useMutation(
    trpc.teams.updateName.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.teams.list.queryKey(),
        })
        toast(defaultSuccessToast(USER_MESSAGES.teamNameUpdated.message))
        setIsEditing(false)
      },
      onError: (error): void => {
        const validationMessages = getTRPCValidationMessages(error)
        if (validationMessages.length > 0) {
          toast(
            defaultErrorToast(getValidationToastContent(validationMessages))
          )
          return
        }

        toast(
          defaultErrorToast(
            error.message || USER_MESSAGES.failedUpdateTeamName.message
          )
        )
      },
    })
  )

  const handleSubmit = (event?: React.FormEvent<HTMLFormElement>): void => {
    event?.preventDefault()
    if (updateNameMutation.isPending || isSaveDisabled) return
    updateNameMutation.mutate({ teamSlug: team.slug, name: trimmedName })
  }

  const handleCancel = (): void => {
    setName(team.name)
    setIsEditing(false)
  }

  useEffect(() => {
    if (!isEditing || !inputRef.current) return
    inputRef.current.focus()
    const cursorPosition = inputRef.current.value.length
    inputRef.current.setSelectionRange(cursorPosition, cursorPosition)
  }, [isEditing])

  const handleStartEditing = (): void => {
    setName(team.name)
    setIsEditing(true)
  }

  const handleNameChange = ({
    target,
  }: React.ChangeEvent<HTMLInputElement>): void => setName(target.value)

  return (
    <div className="flex items-end justify-between gap-4">
      <form
        onSubmit={handleSubmit}
        className="flex min-w-0 flex-1 items-end justify-between gap-4"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Label
            htmlFor="team-name-input"
            className="text-fg-tertiary text-xs leading-[17px] font-normal uppercase"
          >
            name
          </Label>
          <input
            id="team-name-input"
            ref={inputRef}
            value={name}
            onChange={handleNameChange}
            readOnly={!isEditing}
            maxLength={TEAM_NAME_MAX_LENGTH}
            className="w-full appearance-none bg-transparent p-0 text-2xl leading-[1.3] font-semibold tracking-[-0.32px] text-fg caret-accent-main-highlight outline-none"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end">
          {isEditing ? (
            <>
              <Button type="button" variant="quaternary" onClick={handleCancel}>
                Cancel
              </Button>
              <IconButton
                aria-label="Save team name"
                type="submit"
                variant="secondary"
                disabled={isSaveDisabled}
              >
                {updateNameMutation.isPending ? (
                  <Loader variant="slash" size="sm" />
                ) : (
                  <CheckIcon className="size-6 shrink-0" />
                )}
              </IconButton>
            </>
          ) : (
            <IconButton
              aria-label="Edit team name"
              type="button"
              variant="secondary"
              onClick={handleStartEditing}
            >
              <EditIcon className="size-4 shrink-0" />
            </IconButton>
          )}
        </div>
      </form>
    </div>
  )
}
