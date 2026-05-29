'use client'

import { reauthForAccountSettingsAction } from '@/core/server/actions/auth-actions'
import { AlertDialog } from '@/ui/alert-dialog'

interface ReauthDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ReauthDialog({ open, onOpenChange }: ReauthDialogProps) {
  const handleReauth = async () => {
    // Hard navigation (not the Next router): oauth-start is a side-effecting GET
    // that must run exactly once, so a soft RSC navigation would corrupt the
    // OAuth flow. See reauthForAccountSettingsAction.
    const { url } = await reauthForAccountSettingsAction()
    window.location.href = url
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Re-authentication Required"
      description={
        <p className="text-fg-secondary text-md mt-2">
          To make this change, you'll need to <strong>re-authenticate</strong>{' '}
          for security.
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
