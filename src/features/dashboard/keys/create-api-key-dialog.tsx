'use client'

import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { createApiKeyAction } from '@/server/keys/key-actions'
import CopyButton from '@/ui/copy-button'
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/primitives/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/ui/primitives/form'
import { Input } from '@/ui/primitives/input'
import { Label } from '@/ui/primitives/label'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { usePostHog } from 'posthog-js/react'
import { FC, ReactNode, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const formSchema = z.object({
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(50, 'Name cannot be longer than 50 characters')
    .trim(),
})

type FormValues = z.infer<typeof formSchema>

interface CreateApiKeyDialogProps {
  teamId: string
  children?: ReactNode
}

const CreateApiKeyDialog: FC<CreateApiKeyDialogProps> = ({
  teamId,
  children,
}) => {
  'use no memo'

  const [open, setOpen] = useState(false)
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null)
  const posthog = usePostHog()
  const { toast } = useToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  })

  const { execute: createApiKey, isPending } = useAction(createApiKeyAction, {
    onSuccess: ({ data }) => {
      if (data?.createdApiKey) {
        setCreatedApiKey(data.createdApiKey.key)
        form.reset()
      }
    },
    onError: ({ error }) => {
      toast(defaultErrorToast(error.serverError || 'Failed to create API key.'))
    },
  })

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (!value) {
      form.reset()
      setCreatedApiKey(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New API Key</DialogTitle>
          <DialogDescription>
            Create a new API key for your team.
          </DialogDescription>
        </DialogHeader>

        {!createdApiKey ? (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) =>
                createApiKey({ teamId, name: values.name })
              )}
              className="flex flex-col gap-6"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor={field.name}>Name</Label>
                    <FormControl>
                      <Input
                        id={field.name}
                        placeholder="e.g. development-key"
                        autoComplete="off"
                        data-1p-ignore
                        data-form-type="other"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" loading={isPending}>
                  Create Key
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <>
            <div className="animate-in fade-in slide-in-from-right-5 flex flex-col gap-3 duration-200">
              <Label>Your API Key</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={createdApiKey} className="font-mono" />
                <CopyButton
                  value={createdApiKey}
                  onCopy={() => {
                    posthog.capture('copied API key')
                  }}
                />
              </div>
              <Alert variant="warning" className="mt-4">
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Make sure to copy your API Key now.
                  <br /> You won't be able to see it again!
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="muted">Close</Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default CreateApiKeyDialog
