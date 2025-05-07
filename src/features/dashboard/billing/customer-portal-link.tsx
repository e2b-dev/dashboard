'use client'

import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { redirectToCustomerPortal } from '@/server/billing/billing-actions'
import ExternalIcon from '@/ui/external-icon'
import { Button } from '@/ui/primitives/button'
import { useAction } from 'next-safe-action/hooks'
import { Loader } from '@/ui/loader'

interface CustomerPortalLinkProps {
  className?: string
}

export default function CustomerPortalLink({
  className,
}: CustomerPortalLinkProps) {
  const team = useSelectedTeam()

  const { isTransitioning, execute } = useAction(redirectToCustomerPortal)

  if (!team) return null

  return (
    <Button
      onClick={() => execute({ teamId: team.id })}
      disabled={isTransitioning}
      variant="outline"
      size="lg"
      className={className}
    >
      Manage Subscription
      {isTransitioning ? (
        <Loader className="text-accent" />
      ) : (
        <ExternalIcon className="translate-x-1" />
      )}
    </Button>
  )
}
