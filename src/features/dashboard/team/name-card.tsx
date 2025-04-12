'use client'

import { updateTeamNameAction } from '@/server/team/team-actions'
import { Button } from '@/ui/primitives/button'
import { Input } from '@/ui/primitives/input'
import { Skeleton } from '@/ui/primitives/skeleton'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from '@/ui/primitives/form'
import { useToast } from '@/lib/hooks/use-toast'
import { defaultSuccessToast, defaultErrorToast } from '@/lib/hooks/use-toast'
import { UpdateTeamNameSchema } from '@/server/team/types'
import { useHookFormOptimisticAction } from '@next-safe-action/adapter-react-hook-form/hooks'
import { produce } from 'immer'
import { useServerContext } from '@/lib/hooks/use-server-context'

interface NameCardProps {
  className?: string
}

export function NameCard({ className }: NameCardProps) {
  'use no memo'

  const team = useSelectedTeam()
  const { teams, setTeams } = useServerContext()

  const { toast } = useToast()

  const {
    form,
    handleSubmitWithAction,
    action: { isPending },
  } = useHookFormOptimisticAction(
    updateTeamNameAction,
    zodResolver(UpdateTeamNameSchema),
    {
      formProps: {
        defaultValues: {
          teamId: team?.id ?? '',
          name: team?.name ?? '',
        },
      },
      actionProps: {
        currentState: {
          team,
        },
        updateFn: (state, input) => {
          if (!state.team) return state

          const updatedTeams = produce(teams, (draft) => {
            const team = draft.find((t) => t.id === input.teamId)

            if (team) {
              team.name = input.name
            }
          })

          setTeams(updatedTeams)

          return {
            team: {
              ...state.team,
              name: input.name,
            },
          }
        },
        onSuccess: async () => {
          toast(defaultSuccessToast('Team name updated.'))
        },
        onError: ({ error }) => {
          if (!error.serverError) return

          toast(
            defaultErrorToast(
              error.serverError || 'Failed to update team name.'
            )
          )
        },
      },
    }
  )

  const { reset, watch } = form

  useEffect(() => {
    if (team) {
      reset({ name: team.name, teamId: team.id })
    }
  }, [team, reset])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Name</CardTitle>
        <CardDescription>
          Change your team name to display on your invoices and receipts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {team ? (
          <Form {...form}>
            <form
              onSubmit={handleSubmitWithAction}
              className="flex max-w-sm gap-2"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="Acme, Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                variant="outline"
                loading={isPending}
                disabled={watch('name') === team.name}
              >
                Save
              </Button>
            </form>
          </Form>
        ) : (
          <Skeleton className="h-8 w-[17rem]" />
        )}
      </CardContent>
    </Card>
  )
}
