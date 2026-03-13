'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Paperclip, X } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { usePostHog } from 'posthog-js/react'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { useDashboard } from '@/features/dashboard/context'
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
import FileDropZone from './file-drop-zone'

const MAX_ATTACHMENTS = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB per file
const E2B_API_KEY_REGEX = /e2b_[a-f0-9]{40}/i

const ACCEPTED_FILE_TYPES =
  'image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain'

const supportFormSchema = z.object({
  description: z.string().min(1, 'Please describe how we can help'),
})

type SupportFormValues = z.infer<typeof supportFormSchema>

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string | null
      // Strip the data URL prefix (e.g. "data:image/png;base64,")
      resolve(result?.split(',')[1] ?? '')
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface ContactSupportDialogProps {
  trigger: React.ReactNode
}

export default function ContactSupportDialog({
  trigger,
}: ContactSupportDialogProps) {
  const posthog = usePostHog()
  const { team } = useDashboard()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const trpc = useTRPC()

  const [isOpen, setIsOpen] = useState(false)
  const [wasSubmitted, setWasSubmitted] = useState(false)
  const [files, setFiles] = useState<File[]>([])

  // Auto-open dialog when ?support=true is in the URL
  useEffect(() => {
    if (searchParams.get('support') === 'true') {
      setIsOpen(true)
      const params = new URLSearchParams(searchParams.toString())
      params.delete('support')
      const query = params.toString()
      router.replace(`${pathname}${query ? `?${query}` : ''}`, {
        scroll: false,
      })
    }
  }, [searchParams, router, pathname])

  const form = useForm<SupportFormValues>({
    resolver: zodResolver(supportFormSchema),
    defaultValues: {
      description: '',
    },
  })

  const contactSupportMutation = useMutation(
    trpc.support.contactSupport.mutationOptions({
      onSuccess: (data) => {
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
      onError: (error) => {
        toast.error(
          error.message ?? 'Failed to send message. Please try again.'
        )
      },
    })
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

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    const oversized = newFiles.filter((f) => f.size > MAX_FILE_SIZE)
    if (oversized.length > 0) {
      toast.error(
        `${oversized.length} file${oversized.length > 1 ? 's' : ''} exceeded the 10MB limit and ${oversized.length > 1 ? 'were' : 'was'} not added.`
      )
    }
    const valid = newFiles.filter((f) => f.size <= MAX_FILE_SIZE)
    setFiles((prev) => {
      const remaining = MAX_ATTACHMENTS - prev.length
      return [...prev, ...valid.slice(0, remaining)]
    })
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const onSubmit = async (values: SupportFormValues) => {
    const description = values.description.trim()

    if (E2B_API_KEY_REGEX.test(description)) {
      toast.error(
        'Your message contains an API key. Please remove it before sending.'
      )
      return
    }

    const filePayloads = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        type: file.type,
        base64: await fileToBase64(file),
      }))
    )

    contactSupportMutation.mutate({
      teamIdOrSlug: team.id,
      description,
      files: filePayloads.length > 0 ? filePayloads : undefined,
    })
  }

  const isSubmitting = contactSupportMutation.isPending

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
                      disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                disabled={isSubmitting || !form.formState.isValid}
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
