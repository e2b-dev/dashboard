'use client'

import { updateTeamNameAction } from '@/server/team/team-actions'
import { Button } from '@/ui/primitives/button'
import { Input } from '@/ui/primitives/input'
import { Skeleton } from '@/ui/primitives/skeleton'
import { useSelectedTeam, useTeams } from '@/lib/hooks/use-teams'
import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
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
import { useAction } from 'next-safe-action/hooks'
import { defaultSuccessToast, defaultErrorToast } from '@/lib/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface NameCardProps {
  className?: string
}

const formSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
})

type FormValues = z.infer<typeof formSchema>

export function NameCard({ className }: NameCardProps) {
  'use no memo'

  const team = useSelectedTeam()
  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: team?.name ?? '',
    },
  })

  const { reset, watch } = form

  useEffect(() => {
    if (team) {
      reset({ name: team.name })
    }
  }, [team, reset])

  const { execute: updateName, isPending } = useAction(updateTeamNameAction, {
    onSuccess: async () => {
      toast(defaultSuccessToast('Team name updated.'))
    },
    onError: (error) => {
      toast(
        defaultErrorToast(
          error.error.serverError || 'Failed to update team name.'
        )
      )
    },
  })

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
              onSubmit={form.handleSubmit((values) =>
                updateName({ teamId: team.id, name: values.name })
              )}
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
