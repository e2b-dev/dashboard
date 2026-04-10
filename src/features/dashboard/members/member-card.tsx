'use client'

import { useQuery } from '@tanstack/react-query'
import { useDashboard } from '@/features/dashboard/context'
import { useTRPC } from '@/trpc/client'
import { ErrorIndicator } from '@/ui/error-indicator'
import { Card, CardContent } from '@/ui/primitives/card'
import MembersPageContent from './members-page-content'

export const MemberCard = () => {
  const { team } = useDashboard()
  const trpc = useTRPC()
  const {
    data: members,
    error,
    isLoading,
  } = useQuery(trpc.teams.members.queryOptions({ teamSlug: team.slug }))

  return (
    <Card>
      <CardContent className="px-0">
        {error ? (
          <ErrorIndicator
            className="bg-bg w-full max-w-full"
            description="Could not load team members"
            message={error.message || 'Unknown error'}
          />
        ) : (
          <MembersPageContent isLoading={isLoading} members={members ?? []} />
        )}
      </CardContent>
    </Card>
  )
}
