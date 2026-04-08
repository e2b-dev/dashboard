import { MemberCard } from '@/features/dashboard/members/member-card'

interface MembersPageProps {
  params: Promise<{
    teamSlug: string
  }>
}

export default async function MembersPage({ params }: MembersPageProps) {
  return (
    <div className="mx-auto w-full max-w-[900px]">
      <MemberCard params={params} />
    </div>
  )
}
