'use client'

import { useDashboard } from '@/features/dashboard/context'
import { contactSupportAction } from '@/server/support/support-actions'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
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
  FormLabel,
  FormMessage,
} from '@/ui/primitives/form'
import { Textarea } from '@/ui/primitives/textarea'
import { zodResolver } from '@hookform/resolvers/zod'
import { Paperclip, X } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { usePostHog } from 'posthog-js/react'
import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import FileDropZone from './file-drop-zone'

const MAX_ATTACHMENTS = 5

const ACCEPTED_FILE_TYPES =
  'image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain'

const supportFormSchema = z.object({
  description: z.string().min(1, 'Please describe how we can help'),
})

type SupportFormValues = z.infer<typeof supportFormSchema>

interface ContactSupportDialogProps {
  trigger: React.ReactNode
}

export default function ContactSupportDialog({
  trigger,
}: ContactSupportDialogProps) {
  const posthog = usePostHog()
  const { team, user } = useDashboard()

  const [isOpen, setIsOpen] = useState(false)
  const [wasSubmitted, setWasSubmitted] = useState(false)
  const [files, setFiles] = useState<File[]>([])

  const form = useForm<SupportFormValues>({
    resolver: zodResolver(supportFormSchema),
    defaultValues: {
      description: '',
    },
  })

  const { execute: submitSupport, isExecuting } = useAction(
    contactSupportAction,
    {
      onSuccess: ({ data }) => {
        posthog.capture('support_request_submitted', {
          thread_id: data?.threadId,
          team_id: team.id,
          tier: team.tier,
          attachment_count: files.length,
        })
        setWasSubmitted(true)
        toast.success(
          'Message sent successfully. Our team will get back to you shortly.'
        )
        setIsOpen(false)
        resetForm()
        setTimeout(() => {
          setWasSubmitted(false)
        }, 100)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Failed to send message. Please try again.')
      },
    }
  )

  const resetForm = useCallback(() => {
    form.reset()
    setFiles([])
  }, [form])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        posthog.capture('support_form_shown')
      }
      if (!open && !wasSubmitted) {
        posthog.capture('support_form_dismissed')
      }
      setIsOpen(open)
      if (!open) {
        resetForm()
      }
    },
    [posthog, wasSubmitted, resetForm]
  )

  const handleFilesSelected = useCallback(
    (newFiles: File[]) => {
      setFiles((prev) => {
        const remaining = MAX_ATTACHMENTS - prev.length
        return [...prev, ...newFiles.slice(0, remaining)]
      })
    },
    []
  )

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const onSubmit = (values: SupportFormValues) => {
    const formData = new FormData()
    formData.append('description', values.description.trim())
    formData.append('teamId', team.id)
    formData.append('teamName', team.name)
    formData.append('customerEmail', user.email!)
    formData.append('accountOwnerEmail', team.email)
    formData.append('customerTier', team.tier)

    for (const file of files) {
      formData.append('files', file)
    }

    submitSupport(formData)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Contact Support</DialogTitle>
          <DialogDescription>
            Tell us how we can help. Our team will get back to you shortly.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-3"
          >
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what you need help with..."
                      className="min-h-28"
                      disabled={isExecuting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-2">
              <FileDropZone
                onFilesSelected={handleFilesSelected}
                maxFiles={MAX_ATTACHMENTS}
                currentFileCount={files.length}
                isUploading={false}
                disabled={isExecuting}
                accept={ACCEPTED_FILE_TYPES}
              />

              {files.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="flex items-center gap-2 text-sm text-fg-secondary"
                >
                  <Paperclip className="size-3.5 shrink-0 text-fg-tertiary" />
                  <span className="truncate flex-1">{file.name}</span>
                  <span className="shrink-0 text-xs text-fg-tertiary">
                    {(file.size / 1024).toFixed(0)}KB
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    disabled={isExecuting}
                    className="shrink-0 text-fg-tertiary hover:text-fg transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isExecuting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isExecuting || !form.formState.isValid}
                loading={isExecuting}
              >
                Send
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
