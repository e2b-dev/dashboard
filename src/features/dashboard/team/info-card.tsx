'use client'

import { useSelectedTeam } from '@/lib/hooks/use-teams'
import CopyButton from '@/ui/copy-button'
import { Badge } from '@/ui/primitives/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import { Skeleton } from '@/ui/primitives/skeleton'

interface InfoCardProps {
  className?: string
}

export function InfoCard({ className }: InfoCardProps) {
  const team = useSelectedTeam()

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Information</CardTitle>
        <CardDescription>
          Additional information about this team.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {team ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="info">E-Mail</Badge>
              <span>{team.email}</span>
              <CopyButton
                value={team.email}
                variant="ghost"
                className="size-5"
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge>Team ID</Badge>
              <span>{team.id}</span>
              <CopyButton value={team.id} variant="ghost" className="size-5" />
            </div>
          </div>
        ) : (
          <Skeleton className="h-10 w-[17rem]" />
        )}
      </CardContent>
    </Card>
  )
}
