'use client'

import * as React from 'react'
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks'
import { zodResolver } from '@hookform/resolvers/zod'

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
import { useRouter } from 'next/navigation'
import { defaultSuccessToast } from '@/lib/hooks/use-toast'
import { PROTECTED_URLS } from '@/configs/urls'
import { CreateTeamSchema } from '@/server/team/types'

interface CreateTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateTeamDialog({
  open,
  onOpenChange,
}: CreateTeamDialogProps) {
  'use no memo'

  const router = useRouter()

  const {
    form,
    handleSubmitWithAction,
    action: { isExecuting },
  } = useHookFormAction(createTeamAction, zodResolver(CreateTeamSchema), {
    formProps: {
      defaultValues: {
        name: '',
      },
    },
    actionProps: {
      onSuccess: async (result) => {
        handleDialogClose(false)

        toast(defaultSuccessToast('Team was created.'))

        if (result.data && result.data.slug) {
          router.push(PROTECTED_URLS.SANDBOXES(result.data.slug))
          router.refresh()
        }
      },
    },
  })

  function handleDialogClose(value: boolean) {
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
          <form onSubmit={handleSubmitWithAction}>
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
