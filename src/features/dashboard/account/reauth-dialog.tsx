'use client'

import { PROTECTED_URLS } from '@/configs/urls'
import { signOutAction } from '@/server/auth/auth-actions'
import { AlertDialog } from '@/ui/alert-dialog'

interface ReauthDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ReauthDialog({ open, onOpenChange }: ReauthDialogProps) {
  const handleReauth = () => {
    signOutAction(PROTECTED_URLS.ACCOUNT_SETTINGS)
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Re-authentication Required"
      description={
        <p className="text-fg-300 text-md mt-2">
          To change your password, you'll need to{' '}
          <strong>re-authenticate</strong> for security.
        </p>
      }
      confirm="Sign in again"
      confirmProps={{
        variant: 'default',
      }}
      onConfirm={handleReauth}
    />
  )
}
