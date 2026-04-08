import { Suspense } from 'react'
import { getTeamMembers } from '@/core/server/functions/team/get-team-members'
import { ErrorIndicator } from '@/ui/error-indicator'
import {
  Card,
  CardContent,
} from '@/ui/primitives/card'
import { Loader } from '@/ui/primitives/loader_d'
import MembersPageContent from './members-page-content'

interface MemberCardProps {
  params: Promise<{
    teamSlug: string
  }>
  className?: string
}

export const MemberCard = ({ params, className }: MemberCardProps) => (
  <Card className={className}>
    <CardContent>
      <Suspense fallback={<MembersPageContentLoading />}>
        <MembersPageContentLoader params={params} />
      </Suspense>
    </CardContent>
  </Card>
)

const MembersPageContentLoader = async ({ params }: MemberCardProps) => {
  const { teamSlug } = await params

  try {
    const result = await getTeamMembers({ teamSlug })

    if (!result?.data || result.serverError || result.validationErrors) {
      throw new Error(result?.serverError || 'Unknown error')
    }

    return <MembersPageContent members={result.data} />
  } catch (error) {
    return (
      <ErrorIndicator
        className="bg-bg w-full max-w-full"
        description="Could not load team members"
        message={error instanceof Error ? error.message : 'Unknown error'}
      />
    )
  }
}

const MembersPageContentLoading = () => (
  <div className="flex items-center justify-center py-24">
    <Loader />
  </div>
)
