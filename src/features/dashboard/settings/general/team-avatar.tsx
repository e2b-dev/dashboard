'use client'

import type { ReactElement } from 'react'
import { useDashboard } from '@/features/dashboard/context'
import { PatternAvatar } from '@/ui/primitives/avatar'

export const TeamAvatar = (): ReactElement => {
  const { team } = useDashboard()

  return (
    <div className="flex shrink-0 w-36 flex-col gap-2">
      <PatternAvatar className="size-36" letter={team.name} />
    </div>
  )
}
