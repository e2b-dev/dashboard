'use client'

import { updateTeamNameAction } from '@/server/team/team-actions'
import { Button } from '@/ui/primitives/button'
import { Input } from '@/ui/primitives/input'
import { Skeleton } from '@/ui/primitives/skeleton'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
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
import { AnimatePresence, motion } from 'motion/react'
import { exponentialSmoothing } from '@/lib/utils'

interface NameCardProps {
  className?: string
}

export function NameCard({ className }: NameCardProps) {
  'use no memo'

  const team = useSelectedTeam()

  const { toast } = useToast()

  const {
    form,
    handleSubmitWithAction,
    action: { isExecuting, optimisticState },
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

  const { watch } = form

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Name</CardTitle>
        <CardDescription>
          Change your team name to display on your invoices and receipts.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
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
                  <FormItem className="flex-1 gap-1">
                    <FormControl>
                      <Input placeholder="Acme, Inc." {...field} />
                    </FormControl>
                    <AnimatePresence initial={false}>
                      {team.transformed_default_name && (
                        <motion.span
                          className="text-fg-500 ml-0.5 text-xs"
                          animate={{
                            opacity: 1,
                            filter: 'blur(0px)',
                            height: 'auto',
                          }}
                          exit={{ opacity: 0, filter: 'blur(4px)', height: 0 }}
                          transition={{
                            duration: 0.4,
                            ease: exponentialSmoothing(3),
                          }}
                        >
                          Seen as -{' '}
                          <span className="text-contrast-2">
                            {team.transformed_default_name}
                          </span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <FormMessage className="mt-1" />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                variant="outline"
                loading={isExecuting}
                disabled={watch('name') === optimisticState?.team?.name}
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
