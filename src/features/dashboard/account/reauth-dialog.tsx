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
      description={
        <p className="text-fg-300 text-md mt-2">
          Your last <strong>sign in</strong> was too far in the past. To update
          your <strong>password</strong>, you'll need to{' '}
          <strong>re-authenticate</strong>.
        </p>
      }
      confirm="Sign in again"
      confirmProps={{
        variant: 'default',
      }}
      onConfirm={() => signOutAction({ returnTo: '/dashboard/account' })}
    />
  )
}
