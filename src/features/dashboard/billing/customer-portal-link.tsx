'use client'

import { redirectToCustomerPortal } from '@/server/billing/billing-actions'
import ExternalIcon from '@/ui/external-icon'
import { Button } from '@/ui/primitives/button'
import { Loader } from '@/ui/primitives/loader'
import { useAction } from 'next-safe-action/hooks'
import { useParams } from 'next/navigation'

interface CustomerPortalLinkProps {
  className?: string
}

export default function CustomerPortalLink({
  className,
}: CustomerPortalLinkProps) {
  const { teamIdOrSlug } = useParams<{ teamIdOrSlug: string }>()

  const { isTransitioning, execute } = useAction(redirectToCustomerPortal)

  return (
    <Button
      onClick={() => execute({ teamIdOrSlug })}
      disabled={isTransitioning}
      variant="outline"
      size="lg"
      className={className}
    >
      Manage Subscription
      {isTransitioning ? (
        <Loader className="text-accent-main-highlight " />
      ) : (
        <ExternalIcon className="translate-x-1" />
      )}
    </Button>
  )
}
