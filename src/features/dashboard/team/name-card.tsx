'use client'

import { updateTeamNameAction } from '@/server/team/team-actions'
import { Button } from '@/ui/primitives/button'
import { Input } from '@/ui/primitives/input'
import { Skeleton } from '@/ui/primitives/skeleton'
import { useSelectedTeam, useTeams } from '@/lib/hooks/use-teams'
import { useEffect, useTransition } from 'react'
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

interface NameCardProps {
  className?: string
}

type FormData = {
  name: string
}

const formSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
})

export function NameCard({ className }: NameCardProps) {
  'use no memo'

  const { refetch: refetchTeams } = useTeams()
  const team = useSelectedTeam()
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  // Initialize react-hook-form
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: team?.name ?? '',
    },
  })

  const { control, handleSubmit, reset, getValues, watch } = form

  // Reset the form when team changes
  useEffect(() => {
    if (team) {
      reset({ name: team.name })
    }
  }, [team, reset])

  const canSubmit = getValues('name') !== team?.name
  // Async submission using useTransition
  const handleUpdate = async (values: FormData) => {
    if (!team) return

    startTransition(async () => {
      try {
        const response = await updateTeamNameAction({
          teamId: team.id,
          name: values.name,
        })

        if (response.type === 'error') {
          toast({
            title: 'Error updating team name',
            description: response.message,
            variant: 'error',
          })
          return
        }

        await refetchTeams()
        toast({
          title: 'Success',
          description: 'Team name updated successfully',
          variant: 'default',
        })
      } catch (error: unknown) {
        if (error instanceof Error) {
          toast({
            title: 'Error updating team name',
            description: error.message,
            variant: 'error',
          })
        } else {
          toast({
            title: 'Error updating team name',
            description: 'An unknown error occurred',
            variant: 'error',
          })
        }
      }
    })
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Name</CardTitle>
        <CardDescription>
          Change your team name to display on your invoices and receipts
        </CardDescription>
      </CardHeader>
      <CardContent>
        {team ? (
          <Form {...form}>
            <form
              onSubmit={handleSubmit(handleUpdate)}
              className="flex max-w-sm items-center gap-2"
            >
              <FormField
                control={control}
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
                disabled={!canSubmit}
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
