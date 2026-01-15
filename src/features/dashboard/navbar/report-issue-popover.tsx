'use client'

import { reportIssueAction } from '@/server/support/support-actions'
import { Button } from '@/ui/primitives/button'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import { Input } from '@/ui/primitives/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/primitives/popover'
import { Textarea } from '@/ui/primitives/textarea'
import { useState } from 'react'
import { toast } from 'sonner'

interface ReportIssuePopoverProps {
  trigger: React.ReactNode
}

export default function ReportIssuePopover({
  trigger,
}: ReportIssuePopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [sandboxId, setSandboxId] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!sandboxId.trim() || !description.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await reportIssueAction({
        sandboxId: sandboxId.trim(),
        description: description.trim(),
      })

      if (result?.data?.success) {
        toast.success('Issue reported successfully. Our team will review it shortly.')
        setIsOpen(false)
        setSandboxId('')
        setDescription('')
      } else {
        toast.error('Failed to report issue. Please try again.')
      }
    } catch (error) {
      console.error('Error reporting issue:', error)
      toast.error('Failed to report issue. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
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
              placeholder="Enter sandbox ID"
              aria-label="Sandbox ID"
              value={sandboxId}
              onChange={(e) => setSandboxId(e.target.value)}
              disabled={isSubmitting}
            />
            <Textarea
              id="description"
              placeholder="Describe the issue you're experiencing..."
              aria-label="Issue description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-28"
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              className="w-full mt-2"
              disabled={isSubmitting || !sandboxId.trim() || !description.trim()}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </form>
        </CardContent>
      </PopoverContent>
    </Popover>
  )
}
