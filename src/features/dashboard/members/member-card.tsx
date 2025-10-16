import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import { Suspense } from 'react'
import AddMemberForm from './add-member-form'
import MemberTable from './member-table'

interface MemberCardProps {
  params: Promise<{
    teamIdOrSlug: string
  }>
  className?: string
}

export function MemberCard({ params, className }: MemberCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>Manage your team members.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-8">
          <Suspense>
            <AddMemberForm className="w-full max-w-[24rem]" />
          </Suspense>
          <div className="bg-card w-full overflow-x-auto">
            <MemberTable params={params} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
