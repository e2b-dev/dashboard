'use client'

import { AlertDialog } from '@/ui/alert-dialog'
import { signOutAction } from '@/server/auth/auth-actions'

interface ReauthDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ReauthDialog({ open, onOpenChange }: ReauthDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Re-authentication Required"
      description="Your session is over 24 hours old. To update your password, you'll need to sign out and sign back in."
      confirm="Sign out"
      onConfirm={() => signOutAction({ returnTo: '/dashboard/account' })}
    />
  )
}
