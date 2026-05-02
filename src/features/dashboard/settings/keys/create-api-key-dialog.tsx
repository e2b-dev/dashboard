'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'motion/react'
import { useParams } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { usePostHog } from 'posthog-js/react'
import { type FC, type ReactNode, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { createApiKeyAction } from '@/core/server/actions/key-actions'
import { useClipboard } from '@/lib/hooks/use-clipboard'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { EASE_APPEAR } from '@/lib/utils/ui'
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
import { CheckIcon, CopyIcon } from '@/ui/primitives/icons'
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
  children?: ReactNode
}

const CreateApiKeyDialog: FC<CreateApiKeyDialogProps> = ({ children }) => {
  'use no memo'

  const { teamSlug } = useParams() as { teamSlug: string }

  const [open, setOpen] = useState(false)
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null)
  const [wasCopied, copyToClipboard] = useClipboard(1000)
  const posthog = usePostHog()
  const { toast } = useToast()

  const copyKey = () => {
    if (!createdApiKey) return
    copyToClipboard(createdApiKey)
    posthog.capture('copied API key')
  }

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
      <DialogContent className="max-w-[500px]" hideClose={!!createdApiKey}>
        <DialogHeader>
          <DialogTitle>
            {createdApiKey ? 'Your New API Key' : 'New API Key'}
          </DialogTitle>
          {!createdApiKey && (
            <DialogDescription>
              Create a new API key for your team.
            </DialogDescription>
          )}
        </DialogHeader>

        {!createdApiKey ? (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) =>
                createApiKey({ teamSlug, name: values.name })
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
                <Button
                  type="submit"
                  loading={isPending ? 'Creating Key...' : undefined}
                >
                  Create Key
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <>
            <div className="animate-in fade-in slide-in-from-right-5 flex flex-col gap-3 duration-200">
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={createdApiKey}
                  onClick={copyKey}
                  className="caret-transparent cursor-pointer font-mono select-all"
                  aria-label="Copy API key to clipboard"
                />
                <Button
                  type="button"
                  variant="primary"
                  onClick={copyKey}
                  aria-label="Copy API key"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {wasCopied ? (
                      <motion.div
                        key="check"
                        initial={{ opacity: 0.2, scale: 0.97, filter: 'blur(1px)' }}
                        animate={{ opacity: 1, scale: 1.2, filter: 'blur(0px)' }}
                        exit={{ opacity: 0.2, scale: 0.97, filter: 'blur(1px)' }}
                        transition={{ duration: 0.1, ease: EASE_APPEAR }}
                      >
                        <CheckIcon />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="copy"
                        initial={{ opacity: 0.2, scale: 0.9, filter: 'blur(1px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0.2, scale: 0.9, filter: 'blur(1px)' }}
                        transition={{ duration: 0.1, ease: EASE_APPEAR }}
                      >
                        <CopyIcon />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
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
                <Button variant="secondary">Close</Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default CreateApiKeyDialog
