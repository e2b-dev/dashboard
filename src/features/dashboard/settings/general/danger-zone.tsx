'use client'

import { Button } from '@/ui/primitives/button'
import { TrashIcon } from '@/ui/primitives/icons'

export const DangerZone = () => (
  <div className="flex items-center justify-between py-6">
    <span className="text-fg-tertiary text-xs uppercase">danger zone</span>
    <Button variant="error" disabled>
      <TrashIcon className="size-4" />
      Delete team
    </Button>
  </div>
)
