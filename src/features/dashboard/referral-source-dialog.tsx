'use client'

import { useState } from 'react'
import { supabase } from '@/lib/clients/supabase/client'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/primitives/dialog'
import { Input } from '@/ui/primitives/input'

interface ReferralSourceDialogProps {
  userEmail: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReferralSourceDialog({
  userEmail,
  open,
  onOpenChange,
}: ReferralSourceDialogProps) {
  const [source, setSource] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function updateUserMetadata(referralSource: string | null) {
    await supabase.auth.updateUser({
      data: {
        referral_source: referralSource,
        referral_asked: true,
      },
    })
  }

  async function notifySlack(referralSource: string | null) {
    try {
      await fetch('/api/referral-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          source: referralSource,
        }),
      })
    } catch {
      // Non-critical, don't block the user
    }
  }

  async function handleSubmit() {
    if (!source.trim()) return
    setIsSubmitting(true)

    await Promise.all([
      updateUserMetadata(source.trim()),
      notifySlack(source.trim()),
    ])

    onOpenChange(false)
  }

  async function handleSkip() {
    await updateUserMetadata(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleSkip}>
      <DialogContent hideClose>
        <DialogHeader>
          <DialogTitle>Welcome!</DialogTitle>
          <DialogDescription>
            How did you first hear about E2B?
          </DialogDescription>
        </DialogHeader>

        <Input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="e.g. X demo video, E2B hackathon, my colleague..."
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && source.trim()) handleSubmit()
          }}
        />

        <DialogFooter>
          <Button variant="ghost" onClick={handleSkip}>
            Skip
          </Button>
          <Button
            variant="accent"
            onClick={handleSubmit}
            disabled={!source.trim()}
            loading={isSubmitting}
          >
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
