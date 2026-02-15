'use client'

import { useDashboard } from '@/features/dashboard/context'
import { uploadIssueAttachmentAction } from '@/server/support/support-actions'
import { useTRPC } from '@/trpc/client'
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
import { useMutation } from '@tanstack/react-query'
import { Loader2, Paperclip, X } from 'lucide-react'
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

interface Attachment {
  url: string
  fileName: string
  mimeType: string
  size: number
}

interface ReportIssueDialogProps {
  trigger: React.ReactNode
}

export default function ReportIssueDialog({
  trigger,
}: ReportIssueDialogProps) {
  const posthog = usePostHog()
  const trpc = useTRPC()
  const { team, user } = useDashboard()

  const [isOpen, setIsOpen] = useState(false)
  const [wasSubmitted, setWasSubmitted] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploadingCount, setUploadingCount] = useState(0)

  const form = useForm<SupportFormValues>({
    resolver: zodResolver(supportFormSchema),
    defaultValues: {
      description: '',
    },
  })

  const { execute: uploadAttachment } = useAction(
    uploadIssueAttachmentAction,
    {
      onSuccess: ({ data }) => {
        if (data) {
          setAttachments((prev) => [
            ...prev,
            {
              url: data.url,
              fileName: data.fileName,
              mimeType: data.mimeType,
              size: data.size,
            },
          ])
        }
        setUploadingCount((c) => c - 1)
      },
      onError: ({ error }) => {
        setUploadingCount((c) => c - 1)
        const message =
          error.validationErrors?.fieldErrors?.file?.[0] ??
          error.serverError ??
          'Failed to upload file'
        toast.error(message)
      },
    }
  )

  const reportIssueMutation = useMutation(
    trpc.support.reportIssue.mutationOptions({
      onSuccess: (data) => {
        posthog.capture('support_request_submitted', {
          thread_id: data.threadId,
          team_id: team.id,
          tier: team.tier,
          attachment_count: attachments.length,
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
      onError: () => {
        toast.error('Failed to send message. Please try again.')
      },
    })
  )

  const resetForm = useCallback(() => {
    form.reset()
    setAttachments([])
    setUploadingCount(0)
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
    (files: File[]) => {
      for (const file of files) {
        setUploadingCount((c) => c + 1)
        uploadAttachment({ file })
      }
    },
    [uploadAttachment]
  )

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const onSubmit = (values: SupportFormValues) => {
    reportIssueMutation.mutate({
      description: values.description.trim(),
      teamId: team.id,
      teamName: team.name,
      customerEmail: user.email!,
      customerTier: team.tier,
      attachments: attachments.length > 0 ? attachments : undefined,
    })
  }

  const isSubmitting = reportIssueMutation.isPending
  const isUploading = uploadingCount > 0
  const isDisabled = isSubmitting || isUploading

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
                      disabled={isDisabled}
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
                currentFileCount={attachments.length}
                isUploading={isUploading}
                disabled={isDisabled}
                accept={ACCEPTED_FILE_TYPES}
              />

              {isUploading && (
                <div className="flex items-center gap-2 text-sm text-fg-secondary">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>
                    Uploading {uploadingCount} file
                    {uploadingCount !== 1 ? 's' : ''}...
                  </span>
                </div>
              )}

              {attachments.map((att, i) => (
                <div
                  key={`${att.fileName}-${i}`}
                  className="flex items-center gap-2 text-sm text-fg-secondary"
                >
                  <Paperclip className="size-3.5 shrink-0 text-fg-tertiary" />
                  <span className="truncate flex-1">{att.fileName}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    disabled={isDisabled}
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
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isDisabled || !form.formState.isValid}
                loading={isSubmitting}
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
