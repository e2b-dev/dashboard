'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePostHog } from 'posthog-js/react'
import { type FC, type ReactNode, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useClipboard } from '@/lib/hooks/use-clipboard'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
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
import {
  AddIcon,
  CheckIcon,
  CopyIcon,
  WarningIcon,
} from '@/ui/primitives/icons'
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

  const nameDraft = form.watch('name')
  const canSubmit = nameDraft.trim().length > 0

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
            <AddIcon className="size-4" aria-hidden />
            Create a key
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        {!createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle>Create new key</DialogTitle>
              <DialogDescription className="sr-only">
                Enter a name and create a new API key for this team.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((values) => {
                  createMutation.mutate({ teamSlug, name: values.name })
                })}
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="sr-only" htmlFor={field.name}>
                        Key name
                      </Label>
                      <div className="flex items-stretch gap-1 py-1">
                        <FormControl>
                          <Input
                            id={field.name}
                            className={cn(
                              'h-9 min-h-9 flex-1 rounded-none border-stroke bg-bg font-sans text-sm normal-case',
                              'placeholder:text-fg-tertiary'
                            )}
                            placeholder="Enter key name"
                            autoComplete="off"
                            data-1p-ignore
                            data-form-type="other"
                            {...field}
                          />
                        </FormControl>
                        <Button
                          type="submit"
                          variant={canSubmit ? 'default' : 'muted'}
                          className="h-9 shrink-0 gap-1 px-3 font-sans normal-case"
                          disabled={!canSubmit || createMutation.isPending}
                          loading={createMutation.isPending}
                        >
                          <AddIcon className="size-4" aria-hidden />
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
            <DialogHeader>
              <DialogTitle>{successTitle}</DialogTitle>
              <DialogDescription className="sr-only">
                Your new API key is shown once. Copy it before closing.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <div className="flex gap-1">
                <Input
                  readOnly
                  value={createdKey}
                  className="border-stroke h-9 min-h-0 flex-1 rounded-none border font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="default"
                  className="h-9 shrink-0 gap-1.5 px-3 font-sans normal-case active:translate-y-0"
                  onClick={() => {
                    void copyReveal(createdKey)
                    posthog.capture('copied API key')
                  }}
                >
                  <span
                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center"
                    aria-hidden
                  >
                    {copiedReveal ? (
                      <CheckIcon className="size-5" />
                    ) : (
                      <CopyIcon className="size-4" />
                    )}
                  </span>
                  Copy
                </Button>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="bg-accent-warning-bg/90 flex w-fit items-center gap-0.5 py-0.5 pr-1.5 pl-0.5">
                  <WarningIcon
                    className="text-accent-warning-highlight size-3 shrink-0"
                    aria-hidden
                  />
                  <span className="text-accent-warning-highlight prose-label uppercase">
                    Important
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <p className="text-fg prose-body min-w-0 flex-1">
                    Copy the key now. You won&apos;t be able to view it again.
                  </p>
                  <DialogClose asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="slate"
                      className="text-fg-tertiary hover:text-fg shrink-0 font-sans text-sm font-medium normal-case"
                    >
                      Close
                    </Button>
                  </DialogClose>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
