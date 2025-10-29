'use client'

import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { createOrderAction } from '@/server/billing/billing-actions'
import { Button } from '@/ui/primitives/button'
import { Label } from '@/ui/primitives/label'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { ConcurrentSandboxAddOnPurchaseDialog } from './concurrent-sandboxes-addon-dialog'

interface ConcurrentSandboxAddonSectionProps {
  priceCents: number
  currentConcurrentSandboxesLimit?: number
}

export function ConcurrentSandboxAddonSection({
  priceCents,
  currentConcurrentSandboxesLimit,
}: ConcurrentSandboxAddonSectionProps) {
  const team = useSelectedTeam()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const {
    execute: createOrder,
    isPending: isCreateOrderLoading,
    result,
  } = useAction(createOrderAction, {
    onSuccess: ({ data }) => {
      if (!data) return

      setIsDialogOpen(true)
    },
    onError: ({ error }) => {
      toast(defaultErrorToast(error.serverError ?? 'Failed to create order'))
    },
  })

  const data = result.data

  return (
    <>
      <div className="border-stroke border-t py-4 px-5">
        <Label className="mb-3 block">Available Add-ons</Label>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex-1">
            <p className="prose-body text-fg">+500 Concurrent Sandboxes</p>
            <p className="text-fg-tertiary prose-label mt-0.5 uppercase">
              {`+$${(priceCents / 100).toFixed(2)}/mo`}
            </p>
          </div>
          <Button
            variant="default"
            size="default"
            className="w-full sm:w-auto sm:shrink-0"
            loading={isCreateOrderLoading}
            disabled={isCreateOrderLoading || !team}
            onClick={() => {
              if (!team) return

              createOrder({
                teamId: team.id,
                itemId: 'addon_500_sandboxes',
              })
            }}
          >
            Buy Add-on
          </Button>
        </div>
      </div>

      {data && (
        <ConcurrentSandboxAddOnPurchaseDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          orderId={data.id}
          monthlyPriceCents={priceCents}
          amountDueCents={data.amount_due}
          currentConcurrentSandboxesLimit={currentConcurrentSandboxesLimit}
        />
      )}
    </>
  )
}
