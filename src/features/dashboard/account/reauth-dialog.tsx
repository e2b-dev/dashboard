'use client'

import { reauthForAccountSettingsAction } from '@/core/server/actions/auth-actions'
import { AlertDialog } from '@/ui/alert-dialog'

interface ReauthDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ReauthDialog({ open, onOpenChange }: ReauthDialogProps) {
  const handleReauth = () => {
    reauthForAccountSettingsAction()
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Re-authentication Required"
      description={
        <p className="text-fg-secondary text-md mt-2">
          To change your password, you'll need to{' '}
          <strong>re-authenticate</strong> for security.
        </p>
      }
      confirm="Sign in again"
      confirmProps={{
        variant: 'primary',
      }}
      onConfirm={handleReauth}
    />
  )
}
