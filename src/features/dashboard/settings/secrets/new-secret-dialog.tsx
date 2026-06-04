'use client'

import { type ReactNode, useState } from 'react'
import { defaultSuccessToast, toast } from '@/lib/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/primitives/dialog'
import { AddIcon } from '@/ui/primitives/icons'
import { SecretForm } from './components/secret-form'
import { flattenHosts, type SecretFormOutput } from './schema'

interface NewSecretDialogProps {
  children: ReactNode
}

export function NewSecretDialog({ children }: NewSecretDialogProps) {
  const [open, setOpen] = useState(false)

  const handleSubmit = (values: SecretFormOutput) => {
    // BE-ready payload shape: hosts come out of the form as `{ value }` objects
    // (required by RHF's useFieldArray) and the BE expects plain strings.
    const _payload = {
      label: values.label,
      value: values.value,
      description: values.description,
      allowList:
        values.allowList.mode === 'all'
          ? { mode: 'all' as const }
          : {
              mode: 'specific' as const,
              hosts: flattenHosts(values.allowList.hosts),
            },
    }
    // TODO(secrets-be): swap for `trpc.secrets.create.mutateAsync(_payload)`.
    toast(defaultSuccessToast('Secret added (UI only — backend pending)'))
    setOpen(false)
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex flex-col gap-4 px-6 pt-5 pb-6 max-h-[calc(100svh-2rem)] sm:h-[620px] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add new secret</DialogTitle>
        </DialogHeader>

        <SecretForm
          loadingLabel="Adding secret…"
          onSubmit={handleSubmit}
          submitIcon={<AddIcon aria-hidden className="size-4" />}
          submitLabel="Add"
        />
      </DialogContent>
    </Dialog>
  )
}
