'use client'

import { cn } from '@/lib/utils'
import RootPathInput from './root-path-input'

interface SandboxInspectHeaderProps {
  className?: string
  rootPath: string
}

export default function SandboxInspectHeader({
  className,
  rootPath,
}: SandboxInspectHeaderProps) {
  return (
    <RootPathInput
      className={cn('w-full', className)}
      initialValue={rootPath}
    />
  )
}
