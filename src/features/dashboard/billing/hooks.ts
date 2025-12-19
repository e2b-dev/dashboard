'use client'

import { useTRPC } from '@/trpc/client'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { extractAddonData, extractTierData } from './utils'

export function useBillingItems() {
  const { teamIdOrSlug } = useParams<{ teamIdOrSlug: string }>()
  const trpc = useTRPC()

  const { data: items, isLoading } = useQuery(
    trpc.billing.getItems.queryOptions({ teamIdOrSlug })
  )

  const tierData = items ? extractTierData(items) : undefined
  const addonData =
    items && tierData ? extractAddonData(items, tierData.selected?.id) : undefined

  return {
    items,
    tierData,
    addonData,
    isLoading,
  }
}
