'use client'

import { useDashboard } from '@/features/dashboard/context'
import { defaultSuccessToast, toast } from '@/lib/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/ui/primitives/dialog'
import { CheckIcon } from '@/ui/primitives/icons'
import { SecretForm } from './components/secret-form'
import {
  flattenHosts,
  type SecretFormInput,
  type SecretFormOutput,
} from './schema'
import { useSecretsStore } from './store'
import type { Secret } from './types'

interface EditSecretDialogProps {
  secret: Secret
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditSecretDialog({
  secret,
  open,
  onOpenChange,
}: EditSecretDialogProps) {
  const { team } = useDashboard()
  const updateSecret = useSecretsStore((s) => s.updateSecret)

  const defaultValues: Partial<SecretFormInput> = {
    label: secret.label,
    description: secret.description ?? '',
    allowList:
      secret.allowList.mode === 'all'
        ? { mode: 'all', hosts: [] }
        : {
            mode: 'specific',
            hosts: secret.allowList.hosts.map((value) => ({ value })),
          },
  }

  // TODO(secrets-be): swap for `trpc.secrets.update.mutateAsync(...)`. The
  // plaintext value is intentionally never collected on edit (only the BE
  // ever sees it on create).
  const handleSubmit = (values: SecretFormOutput) => {
    updateSecret(team.slug, secret.id, {
      label: values.label,
      description: values.description || undefined,
      allowList:
        values.allowList.mode === 'all'
          ? { mode: 'all' }
          : {
              mode: 'specific',
              hosts: flattenHosts(values.allowList.hosts),
            },
    })
    toast(defaultSuccessToast('Secret updated'))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-4 px-6 pt-5 pb-6 max-h-[calc(100svh-2rem)] sm:h-[560px] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Edit secret</DialogTitle>
        </DialogHeader>

        <SecretForm
          defaultValues={defaultValues}
          loadingLabel="Saving…"
          mode="edit"
          onSubmit={handleSubmit}
          requireDirty
          submitIcon={<CheckIcon aria-hidden className="size-4" />}
          submitLabel="Save changes"
        />
      </DialogContent>
    </Dialog>
  )
}
