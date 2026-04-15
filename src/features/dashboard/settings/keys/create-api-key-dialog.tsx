'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckIcon, Plus } from 'lucide-react'
import { usePostHog } from 'posthog-js/react'
import { type FC, type ReactNode, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useClipboard } from '@/lib/hooks/use-clipboard'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { useTRPC } from '@/trpc/client'
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
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
import { CopyIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import { Label } from '@/ui/primitives/label'

const formSchema = z.object({
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(50, 'Name cannot be longer than 50 characters')
    .trim(),
})

type FormValues = z.infer<typeof formSchema>

interface CreateApiKeyDialogProps {
  teamSlug: string
  children?: ReactNode
}

export const CreateApiKeyDialog: FC<CreateApiKeyDialogProps> = ({
  teamSlug,
  children,
}) => {
  'use no memo'

  const [open, setOpen] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [createdName, setCreatedName] = useState<string | null>(null)

  const posthog = usePostHog()
  const { toast } = useToast()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [copiedReveal, copyReveal] = useClipboard()

  const listQueryKey = trpc.teams.listApiKeys.queryOptions({
    teamSlug,
  }).queryKey

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  })

  const createMutation = useMutation(
    trpc.teams.createApiKey.mutationOptions({
      onSuccess: (data) => {
        if (data.createdApiKey?.key) {
          setCreatedKey(data.createdApiKey.key)
          setCreatedName(data.createdApiKey.name ?? '')
          form.reset()
        }
        void queryClient.invalidateQueries({ queryKey: listQueryKey })
      },
      onError: (err) => {
        toast(defaultErrorToast(err.message || 'Failed to create API key.'))
      },
    })
  )

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (!value) {
      form.reset()
      setCreatedKey(null)
      setCreatedName(null)
    }
  }

  const successTitle =
    createdName != null && createdName.length > 0
      ? `${createdName.toUpperCase()} KEY CREATED`
      : 'API KEY CREATED'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children ?? (
          <Button
            type="button"
            className="h-9 w-full shrink-0 gap-2 font-sans normal-case lg:w-auto lg:self-start"
          >
            <Plus className="size-4" aria-hidden />
            Create a key
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[512px] gap-0 p-0">
        {!createdKey ? (
          <>
            <DialogHeader className="border-stroke border-b px-5 py-4">
              <DialogTitle className="font-sans text-base font-semibold tracking-tight uppercase">
                Create new key
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((values) => {
                  createMutation.mutate({ teamSlug, name: values.name })
                })}
                className="flex flex-col gap-4 px-5 py-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="gap-2">
                      <Label
                        className="text-fg-tertiary sr-only"
                        htmlFor={field.name}
                      >
                        Key name
                      </Label>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <FormControl>
                          <Input
                            id={field.name}
                            className="h-9 font-sans normal-case"
                            placeholder="Enter key name"
                            autoComplete="off"
                            data-1p-ignore
                            data-form-type="other"
                            {...field}
                          />
                        </FormControl>
                        <Button
                          type="submit"
                          className="h-9 shrink-0 gap-1.5 font-sans normal-case sm:min-w-[100px]"
                          loading={createMutation.isPending}
                          disabled={createMutation.isPending}
                        >
                          <Plus className="size-4" aria-hidden />
                          Create
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </>
        ) : (
          <>
            <DialogHeader className="border-stroke border-b px-5 py-4">
              <DialogTitle className="font-sans text-base font-semibold tracking-tight uppercase">
                {successTitle}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <Input
                  readOnly
                  value={createdKey}
                  className="h-9 flex-1 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="default"
                  className="h-9 shrink-0 gap-2 px-4 font-sans normal-case sm:min-w-[88px]"
                  onClick={() => {
                    void copyReveal(createdKey)
                    posthog.capture('copied API key')
                  }}
                >
                  {copiedReveal ? (
                    <CheckIcon className="size-4" aria-hidden />
                  ) : (
                    <CopyIcon className="size-4" />
                  )}
                  Copy
                </Button>
              </div>
              <Alert variant="warning" className="border-stroke">
                <AlertTitle className="font-sans text-xs font-semibold uppercase">
                  Important
                </AlertTitle>
                <AlertDescription className="font-sans text-sm normal-case leading-snug">
                  Copy the key now. You won&apos;t be able to view it again.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter className="border-stroke border-t px-5 py-4">
              <DialogClose asChild>
                <Button variant="muted" className="font-sans normal-case">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
