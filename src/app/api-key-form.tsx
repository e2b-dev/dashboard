'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { setApiKeyAction } from '@/app/actions'
import { E2BLogo } from '@/ui/brand'
import { Button } from '@/ui/primitives/button'
import { Input } from '@/ui/primitives/input'
import { Label } from '@/ui/primitives/label'

interface ApiKeyFormProps {
  destination: string
}

export function ApiKeyForm({ destination }: ApiKeyFormProps) {
  const [apiKey, setApiKey] = useState('')

  const { execute, isExecuting, result } = useAction(setApiKeyAction)

  const errorMessage =
    result?.serverError ??
    result?.validationErrors?.fieldErrors?.apiKey?.[0] ??
    null

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        execute({ apiKey, destination })
      }}
    >
      <E2BLogo className="size-12" />
      <div className="flex flex-col gap-1">
        <h1 className="prose-headline">Dashboard</h1>
        <p className="prose-body text-fg-secondary">
          Enter a team API key to manage its sandboxes and templates.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="api-key">API key</Label>
        <Input
          id="api-key"
          name="apiKey"
          type="password"
          placeholder="e2b_..."
          autoComplete="off"
          autoFocus
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        {errorMessage && (
          <p className="prose-label text-accent-error-highlight">
            {errorMessage}
          </p>
        )}
      </div>

      <Button
        type="submit"
        loading={isExecuting ? 'Validating...' : undefined}
        disabled={!apiKey.trim()}
      >
        Continue
      </Button>
    </form>
  )
}
