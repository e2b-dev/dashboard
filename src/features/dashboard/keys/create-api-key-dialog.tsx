'use client'

import { createApiKeyAction } from '@/server/keys/key-actions'
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/primitives/dialog'
import { Input } from '@/ui/primitives/input'
import { Label } from '@/ui/primitives/label'
import { useMutation } from '@tanstack/react-query'
import { FC, ReactNode, useState } from 'react'
import CopyButton from '@/ui/copy-button'
import { usePostHog } from 'posthog-js/react'

interface CreateApiKeyDialogProps {
  teamId: string
  children?: ReactNode
}

const CreateApiKeyDialog: FC<CreateApiKeyDialogProps> = ({
  teamId,
  children,
}) => {
  const [keyName, setKeyName] = useState('')
  const posthog = usePostHog()

  // mutations
  const {
    data: createdApiKey,
    mutate: createApiKey,
    isPending: isMutatingApiKeyCreation,
    reset: resetCreateApiKeyMutation,
  } = useMutation({
    mutationFn: async (name: string) => {
      const response = await createApiKeyAction({ teamId, name })

      if (response.type === 'error') {
        throw new Error(response.message)
      }

      return response.data.createdApiKey
    },
    onError: (error) => {
      console.error('createApiKeyAction error:', error.message)
    },
  })

  return (
    <Dialog
      onOpenChange={(value) => {
        if (value) return

        setKeyName('')
        resetCreateApiKeyMutation()
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New API Key</DialogTitle>
          <DialogDescription>
            Create a new API key for your team.
          </DialogDescription>
        </DialogHeader>

        {!createdApiKey ? (
          <form
            key="create-form"
            onSubmit={(e) => {
              e.preventDefault()
              createApiKey(keyName)
            }}
          >
            <div className="flex flex-col gap-3 px-2 py-6">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="key-name"
                placeholder="e.g. development-key"
                required
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                autoComplete="off"
                data-1p-ignore
                data-form-type="other"
              />
            </div>

            <DialogFooter>
              <Button type="submit" loading={isMutatingApiKeyCreation}>
                Create Key
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <div className="animate-in fade-in slide-in-from-right-5 flex flex-col gap-3 px-2 py-6 duration-200">
              <Label>Your API Key</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={createdApiKey} className="font-mono" />
                <CopyButton
                  value={createdApiKey}
                  onCopy={() => {
                    posthog.capture('copied API key')
                  }}
                />
              </div>
              <Alert variant="warning" className="mt-4">
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Make sure to copy your API key now.
                  <br /> You won't be able to see it again!
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="muted">Close</Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default CreateApiKeyDialog
