'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type ReactElement, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { USER_MESSAGES } from '@/configs/user-messages'
import {
  TEAM_NAME_MAX_LENGTH,
  UpdateTeamNameSchema,
} from '@/core/modules/teams/schemas'
import { useDashboard } from '@/features/dashboard/context'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/ui/primitives/form'
import { IconButton } from '@/ui/primitives/icon-button'
import { CheckIcon, EditIcon } from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'

const TeamNameFormSchema = UpdateTeamNameSchema.pick({ name: true })

type TeamNameFormValues = z.infer<typeof TeamNameFormSchema>

export const TeamName = (): ReactElement => {
  const { team } = useDashboard()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const form = useForm<TeamNameFormValues>({
    resolver: zodResolver(TeamNameFormSchema),
    defaultValues: {
      name: team.name,
    },
  })
  const name = form.watch('name')
  const trimmedName = name.trim()

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
        toast(
          defaultErrorToast(
            error.message || USER_MESSAGES.failedUpdateTeamName.message
          )
        )
      },
    })
  )
  const isSaveDisabled =
    updateNameMutation.isPending || !trimmedName || trimmedName === team.name

  const handleSubmit = ({ name }: TeamNameFormValues): void => {
    if (isSaveDisabled) return
    updateNameMutation.mutate({ teamSlug: team.slug, name })
  }

  const handleCancel = (): void => {
    form.reset({ name: team.name })
    setIsEditing(false)
  }

  useEffect(() => {
    if (!isEditing || !inputRef.current) return
    inputRef.current.focus()
    const cursorPosition = inputRef.current.value.length
    inputRef.current.setSelectionRange(cursorPosition, cursorPosition)
  }, [isEditing])

  const handleStartEditing = (): void => {
    form.reset({ name: team.name })
    setIsEditing(true)
  }

  return (
    <div className="flex items-end justify-between gap-4">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex min-w-0 flex-1 items-end justify-between gap-4"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="flex min-w-0 flex-1 flex-col gap-1">
                <FormLabel className="text-fg-tertiary text-xs leading-[17px] font-normal uppercase">
                  name
                </FormLabel>
                <FormControl>
                  <input
                    readOnly={!isEditing}
                    maxLength={TEAM_NAME_MAX_LENGTH}
                    className="w-full appearance-none bg-transparent p-0 text-2xl leading-[1.3] font-semibold tracking-[-0.32px] text-fg caret-accent-main-highlight outline-none"
                    {...field}
                    ref={(element) => {
                      field.ref(element)
                      inputRef.current = element
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex shrink-0 items-center gap-2 self-end">
            {isEditing ? (
              <>
                <Button
                  type="button"
                  variant="quaternary"
                  onClick={handleCancel}
                >
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
      </Form>
    </div>
  )
}
