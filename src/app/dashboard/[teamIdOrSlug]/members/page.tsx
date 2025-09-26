import { MemberCard } from '@/features/dashboard/members/member-card'
import Frame from '@/ui/frame'

interface MembersPageProps {
  params: Promise<{
    teamIdOrSlug: string
  }>
}

export default async function MembersPage({ params }: MembersPageProps) {
  return (
    <Frame
      classNames={{
        wrapper: 'w-full max-md:p-0',
        frame: 'max-md:border-none',
      }}
    >
      <section className="col-span-full border-t">
        <MemberCard params={params} className="" />
      </section>
    </Frame>
  )
}
