'use client'

import { USER_MESSAGES } from '@/configs/user-messages'
import { useDashboard } from '@/features/dashboard/context'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { exponentialSmoothing } from '@/lib/utils'
import { cn } from '@/lib/utils/ui'
import { updateTeamNameAction } from '@/server/team/team-actions'
import { UpdateTeamNameSchema } from '@/server/team/types'
import { Button, buttonVariants } from '@/ui/primitives/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/ui/primitives/form'
import { Input } from '@/ui/primitives/input'
import { Loader } from '@/ui/primitives/loader'
import { zodResolver } from '@hookform/resolvers/zod'
import { useHookFormOptimisticAction } from '@next-safe-action/adapter-react-hook-form/hooks'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo } from 'react'

interface NameCardProps {
  className?: string
}

export function NameCard({ className }: NameCardProps) {
  'use no memo'

  const { team, setTeam } = useDashboard()

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
          teamIdOrSlug: team.id,
          name: team.name,
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
        onSuccess: async ({ data }) => {
          toast(defaultSuccessToast(USER_MESSAGES.teamNameUpdated.message))

          setTeam({
            ...team,
            name: data.name,
          })
        },
        onError: ({ error }) => {
          if (!error.serverError) return

          toast(
            defaultErrorToast(
              error.serverError || USER_MESSAGES.failedUpdateTeamName.message
            )
          )
        },
      },
    }
  )

  const { watch } = form

  const name = watch('name')
  const isNameDirty = useMemo(() => name !== team.name, [name, team.name])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Name</CardTitle>
        <CardDescription>
          Change your team name to display on your invoices and receipts.
        </CardDescription>
      </CardHeader>
      <CardContent className="py-0 max-h-full">
        <Form {...form}>
          <form
            onSubmit={handleSubmitWithAction}
            className="flex max-w-sm gap-2 mt-auto"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex-1 gap-1 p-0">
                  <FormControl>
                    <Input placeholder="Acme, Inc." {...field} />
                  </FormControl>
                  <AnimatePresence initial={false}>
                    {team.transformed_default_name && (
                      <motion.span
                        className="text-fg-tertiary ml-0.5 text-xs"
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
                        <span className="text-accent-info-highlight">
                          {team.transformed_default_name}
                        </span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <FormMessage className="mt-1" />
                </FormItem>
              )}
            />
            {isExecuting ? (
              <div className={cn(buttonVariants({ variant: 'quaternary' }))}>
                <Loader variant="slash" size="sm" className="min-w-2" />{' '}
                Saving...
              </div>
            ) : (
              <Button
                type="submit"
                variant="secondary"
                disabled={!isNameDirty || isExecuting}
              >
                Save
              </Button>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
