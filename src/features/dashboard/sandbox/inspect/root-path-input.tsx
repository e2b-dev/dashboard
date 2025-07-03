'use client'

import { cn } from '@/lib/utils'
import { Input } from '@/ui/primitives/input'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/ui/primitives/button'
import { Loader } from '@/ui/loader'
import { ArrowRight, Check, MoveRight } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

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

  const save = async (newPath: string) => {
    try {
      await fetch('/api/sandbox/inspect/root-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath }),
      })
    } catch {
      // ignore
    }
  }

  const handleSubmit = (newPath: string) => {
    if (!newPath) return
    startTransition(async () => {
      await save(newPath)
      router.refresh()
    })
  }

  const isDirty = value !== initialValue

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit(value)
      }}
      className={cn('relative flex h-full items-center gap-2', className)}
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={isPending}
        className="border-none pl-0 focus:!border-none"
        placeholder="/home/user ?"
      />

      <Button
        className="z-20 mr-1.5 h-7 rounded-none"
        size="sm"
        disabled={isPending || !isDirty}
        type="submit"
      >
        Go {isPending ? <Loader /> : <ArrowRight className="size-4" />}
      </Button>
    </form>
  )
}
