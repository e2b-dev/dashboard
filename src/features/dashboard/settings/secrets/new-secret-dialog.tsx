'use client'

import { type ReactNode, useState } from 'react'
import { useDashboard } from '@/features/dashboard/context'
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
import { useSecretsStore } from './store'

interface NewSecretDialogProps {
  children: ReactNode
}

export function NewSecretDialog({ children }: NewSecretDialogProps) {
  const { team, user } = useDashboard()
  const addSecret = useSecretsStore((s) => s.addSecret)
  const [open, setOpen] = useState(false)

  // TODO(secrets-be): swap for `trpc.secrets.create.mutateAsync(...)` once the
  // backend ships. The secret's plaintext `value` intentionally never enters
  // the store — only the BE should ever hold it.
  const handleSubmit = (values: SecretFormOutput) => {
    addSecret(team.slug, {
      label: values.label,
      description: values.description || undefined,
      allowList:
        values.allowList.mode === 'all'
          ? { mode: 'all' }
          : {
              mode: 'specific',
              hosts: flattenHosts(values.allowList.hosts),
            },
      createdBy: { email: user.email, avatarUrl: user.avatarUrl },
    })
    toast(defaultSuccessToast('Secret added'))
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
