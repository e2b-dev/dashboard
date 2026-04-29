'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { PROTECTED_URLS } from '@/configs/urls'
import { CreateTeamSchema } from '@/core/modules/teams/schemas'
import {
  defaultErrorToast,
  defaultSuccessToast,
  toast,
} from '@/lib/hooks/use-toast'
import { getTRPCValidationMessages } from '@/lib/utils/trpc-errors'
import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/primitives/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/ui/primitives/form'
import { Input } from '@/ui/primitives/input'

interface CreateTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const CreateTeamDialog = ({
  open,
  onOpenChange,
}: CreateTeamDialogProps) => {
  'use no memo'

  const router = useRouter()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const form = useForm({
    resolver: zodResolver(CreateTeamSchema),
    defaultValues: {
      name: '',
    },
  })
  const createTeamMutation = useMutation(
    trpc.teams.create.mutationOptions({
      onError: async (error) => {
        const validationMessages = getTRPCValidationMessages(error)
        if (validationMessages.length > 0) {
          toast(defaultErrorToast(validationMessages[0]))
          return
        }

        toast(defaultErrorToast(error.message || 'Failed to create team'))
      },
      onSuccess: async (team) => {
        await queryClient.invalidateQueries({
          queryKey: trpc.teams.list.queryKey(),
        })
        toast(defaultSuccessToast('Team was created'))
        handleDialogChange(false)

        if (!team.slug) return

        router.push(PROTECTED_URLS.SANDBOXES(team.slug))
      },
    })
  )

  const handleSubmit = form.handleSubmit(({ name }) =>
    createTeamMutation.mutate({ name })
  )

  const handleDialogChange = (value: boolean) => {
    onOpenChange(value)

    if (value) return

    form.reset()
    createTeamMutation.reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
          <DialogDescription>
            Create a new team to collaborate with others.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-3 pb-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter team name"
                        disabled={createTeamMutation.isPending}
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
                variant="secondary"
                onClick={() => handleDialogChange(false)}
                disabled={createTeamMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTeamMutation.isPending}
                loading={
                  createTeamMutation.isPending ? 'Creating Team...' : undefined
                }
                variant="primary"
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
