'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAction } from 'next-safe-action/hooks'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/primitives/dialog'
import { Button } from '@/ui/primitives/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/ui/primitives/form'
import { Input } from '@/ui/primitives/input'
import { createTeamAction } from '@/server/team/team-actions'
import { toast } from '@/lib/hooks/use-toast'
import { useTeams } from '@/lib/hooks/use-teams'
import { useRouter } from 'next/navigation'
import { PROTECTED_URLS } from '@/configs/urls'
import { defaultSuccessToast, defaultErrorToast } from '@/lib/hooks/use-toast'

interface CreateTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
})

type FormValues = z.infer<typeof formSchema>

export function CreateTeamDialog({
  open,
  onOpenChange,
}: CreateTeamDialogProps) {
  'use no memo'

  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  })

  const { execute, isExecuting } = useAction(createTeamAction, {
    onSuccess: async (result) => {
      onOpenChange(false)

      toast(defaultSuccessToast('Team was created.'))

      if (result.data) {
        router.push(
          PROTECTED_URLS.SANDBOXES(result.data.slug ?? result.data.id)
        )
      }
    },
    onError: ({ error }) => {
      if (error.serverError) {
        toast(defaultErrorToast(error.serverError))
      } else if (error.validationErrors) {
        toast(defaultErrorToast('Please check the form for errors'))
      }
    },
  })

  const onSubmit = (values: FormValues) => {
    execute(values)
  }

  const handleDialogClose = (value: boolean) => {
    if (value) return

    form.reset()
    onOpenChange(value)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
          <DialogDescription>
            Create a new team to collaborate with others.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-3 px-2 py-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter team name"
                        disabled={isExecuting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isExecuting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isExecuting}
                loading={isExecuting}
              >
                Create Team
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
