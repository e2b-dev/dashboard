'use client'

import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import { Input } from '@/ui/primitives/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/ui/primitives/popover'
import { Textarea } from '@/ui/primitives/textarea'
import { useMutation } from '@tanstack/react-query'
import { usePostHog } from 'posthog-js/react'
import { useState } from 'react'
import { toast } from 'sonner'

interface ReportIssuePopoverProps {
  trigger: React.ReactNode
}

export default function ReportIssuePopover({
  trigger,
}: ReportIssuePopoverProps) {
  const posthog = usePostHog()
  const trpc = useTRPC()
  const [isOpen, setIsOpen] = useState(false)
  const [sandboxId, setSandboxId] = useState('')
  const [description, setDescription] = useState('')
  const [wasSubmitted, setWasSubmitted] = useState(false)

  const reportIssueMutation = useMutation(
    trpc.support.reportIssue.mutationOptions({
      onSuccess: (data) => {
        posthog.capture('issue_reported', {
          sandbox_id: sandboxId.trim() || undefined,
          thread_id: data.threadId,
        })
        setWasSubmitted(true)
        toast.success(
          'Issue reported successfully. Our team will review it shortly.'
        )
        setIsOpen(false)
        setSandboxId('')
        setDescription('')
        setTimeout(() => {
          setWasSubmitted(false)
        }, 100)
      },
      onError: () => {
        toast.error('Failed to report issue. Please try again.')
      },
    })
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!description.trim()) {
      toast.error('Please describe the issue')
      return
    }

    reportIssueMutation.mutate({
      sandboxId: sandboxId.trim() || undefined,
      description: description.trim(),
    })
  }

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        if (open) {
          posthog.capture('issue_report_shown')
        }
        if (!open && !wasSubmitted) {
          posthog.capture('issue_report_dismissed')
        }
        setIsOpen(open)
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>

      <PopoverContent
        className="w-[400px]"
        collisionPadding={12}
        sideOffset={12}
      >
        <CardHeader>
          <CardTitle>Report Issue</CardTitle>
          <CardDescription>
            Our team will get back to you shortly
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
          <form onSubmit={handleSubmit} className="flex flex-col gap-1">
            <Input
              id="sandboxId"
              placeholder="Enter sandbox ID (optional)"
              aria-label="Sandbox ID"
              value={sandboxId}
              onChange={(e) => setSandboxId(e.target.value)}
              disabled={reportIssueMutation.isPending}
            />
            <Textarea
              id="description"
              placeholder="Describe the issue you're experiencing..."
              aria-label="Issue description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-28"
              disabled={reportIssueMutation.isPending}
            />
            <Button
              type="submit"
              className="w-full mt-2"
              disabled={reportIssueMutation.isPending || !description.trim()}
            >
              {reportIssueMutation.isPending ? 'Submitting...' : 'Submit'}
            </Button>
          </form>
        </CardContent>
      </PopoverContent>
    </Popover>
  )
}
