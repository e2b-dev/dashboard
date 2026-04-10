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
import { getTRPCValidationMessages } from '@/lib/utils/trpc-errors'
import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import { CheckIcon, EditIcon } from '@/ui/primitives/icons'

const TEAM_NAME_MAX_FONT_SIZE_PX = 32
const TEAM_NAME_MIN_FONT_SIZE_PX = 18
const TEAM_NAME_INPUT_HEIGHT_PX = 40

export const TeamName = () => {
  const { team } = useDashboard()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(team.name)
  const [fontSize, setFontSize] = useState(TEAM_NAME_MAX_FONT_SIZE_PX)
  const inputRef = useRef<HTMLInputElement>(null)
  const textMeasureRef = useRef<HTMLSpanElement>(null)

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
        const validationMessages = getTRPCValidationMessages(error)
        if (validationMessages.length > 0) {
          const validationToastContent =
            validationMessages.length === 1 ? (
              validationMessages[0]
            ) : (
              <ul className="list-disc space-y-1 pl-4">
                {validationMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            )

          toast(defaultErrorToast(validationToastContent))
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

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (updateNameMutation.isPending) return
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

  useEffect(() => {
    const input = inputRef.current
    const textMeasure = textMeasureRef.current
    if (!input || !textMeasure) return

    let frameId = 0

    const updateFontSize = () => {
      const availableWidth = input.clientWidth
      if (!availableWidth) return

      let nextFontSize = TEAM_NAME_MAX_FONT_SIZE_PX

      textMeasure.textContent = name || ' '
      textMeasure.style.fontSize = `${nextFontSize}px`

      while (
        nextFontSize > TEAM_NAME_MIN_FONT_SIZE_PX &&
        textMeasure.scrollWidth > availableWidth
      ) {
        nextFontSize -= 1
        textMeasure.style.fontSize = `${nextFontSize}px`
      }

      setFontSize((currentFontSize) =>
        currentFontSize === nextFontSize ? currentFontSize : nextFontSize
      )
    }

    const scheduleFontSizeUpdate = () => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(updateFontSize)
    }

    scheduleFontSizeUpdate()

    const resizeObserver = new ResizeObserver(scheduleFontSizeUpdate)
    resizeObserver.observe(input)

    return () => {
      resizeObserver.disconnect()
      window.cancelAnimationFrame(frameId)
    }
  }, [name])

  const handleStartEditing = () => {
    setName(team.name)
    setIsEditing(true)
  }

  return (
    <div className="flex items-end justify-between gap-4">
      <form
        onSubmit={handleSubmit}
        className="flex min-w-0 flex-1 items-end justify-between gap-4"
      >
        <div className="relative flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-fg-tertiary text-xs leading-[17px] font-normal uppercase">
            name
          </span>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            readOnly={!isEditing}
            className="h-10 w-full bg-transparent p-0 text-[32px] leading-8 font-semibold tracking-[-0.32px] text-fg caret-accent-main-highlight outline-none"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: `${TEAM_NAME_INPUT_HEIGHT_PX}px`,
            }}
          />
          <span
            ref={textMeasureRef}
            aria-hidden="true"
            className="pointer-events-none absolute invisible whitespace-pre p-0 text-[32px] leading-8 font-semibold tracking-[-0.32px]"
          >
            {name || ' '}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end">
          {isEditing ? (
            <>
              <Button type="button" variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="outline"
                size="icon"
                className="size-9"
                loading={updateNameMutation.isPending}
                disabled={!name.trim() || name.trim() === team.name}
              >
                <CheckIcon className="size-6 shrink-0" />
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9"
              onClick={handleStartEditing}
            >
              <EditIcon className="size-4 shrink-0" />
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
