'use client'

import { DialogProps } from '@radix-ui/react-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/primitives/dialog'
import InfraDomainForm from './infra-domain-form'

interface DeveloperSettingsDialogProps extends DialogProps {
  apiDomain?: string
  children: React.ReactNode
}

export default function DeveloperSettingsDialog({
  apiDomain,
  children,
  ...props
}: DeveloperSettingsDialogProps) {
  return (
    <Dialog {...props}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Developer Settings</DialogTitle>
          <DialogDescription>
            These are developer settings & should be used with caution.
          </DialogDescription>
        </DialogHeader>
        <InfraDomainForm apiDomain={apiDomain} className="py-6" />
      </DialogContent>
    </Dialog>
  )
}
