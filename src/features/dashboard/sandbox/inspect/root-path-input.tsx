'use client'

import { l } from '@/lib/clients/logger'
import { useSandboxInspectAnalytics } from '@/lib/hooks/use-analytics'
import { cn } from '@/lib/utils'
import { Button } from '@/ui/primitives/button'
import { Input } from '@/ui/primitives/input'
import { Loader } from '@/ui/primitives/loader'
import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { serializeError } from 'serialize-error'

interface RootPathInputProps {
  className?: string
  initialValue: string
}

export default function RootPathInput({
  className,
  initialValue,
}: RootPathInputProps) {
  const [value, setValue] = useState(initialValue)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { trackInteraction } = useSandboxInspectAnalytics()

  const save = async (newPath: string) => {
    try {
      await fetch('/api/sandbox/inspect/root-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath }),
      })
    } catch (error) {
      l.error({
        key: 'sandbox_inspect_root_path_input:save_root_path_failed',
        message:
          error instanceof Error ? error.message : 'Failed to save root path',
        error: serializeError(error),
      })
    }
  }

  const handleSubmit = (newPath: string) => {
    if (!newPath) return
    startTransition(async () => {
      await save(newPath)
      trackInteraction('changed_root_path', { new_path: newPath })
      router.refresh()
    })
  }

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  const isDirty = value !== initialValue

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit(value)
      }}
      className={cn('relative h-full', className)}
    >
      <span className="text-fg-tertiary absolute left-2 top-1/2 -translate-y-1/2">
        {'$'}
      </span>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={isPending}
        placeholder="/home/user"
        className="pl-6 pr-18 border-none h-full"
      />

      <Button
        className="z-20 mr-1.5 h-7 absolute right-0 top-1/2 -translate-y-1/2"
        size="sm"
        disabled={isPending || !isDirty}
        type="submit"
      >
        Go {isPending ? <Loader /> : <ArrowRight className="size-4" />}
      </Button>
    </form>
  )
}
