'use client'

import { PROTECTED_URLS } from '@/configs/urls'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { removeTeamMemberAction } from '@/server/team/team-actions'
import { TeamMember } from '@/server/team/types'
import { AlertDialog } from '@/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/primitives/avatar'
import { Button } from '@/ui/primitives/button'
import { TableCell, TableRow } from '@/ui/primitives/table'
import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useDashboard } from '../context'

interface TableRowProps {
  member: TeamMember
  addedByEmail?: string
  index: number
}

export default function MemberTableRow({
  member,
  addedByEmail,
  index,
}: TableRowProps) {
  const { toast } = useToast()
  const { team } = useDashboard()
  const router = useRouter()
  const { user } = useDashboard()
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)

  const { execute: removeMember, isExecuting: isRemoving } = useAction(
    removeTeamMemberAction,
    {
      onSuccess: ({ input }) => {
        if (input.userId === user?.id) {
          router.push(PROTECTED_URLS.DASHBOARD)
          toast(defaultSuccessToast('You have left the team.'))
        } else {
          toast(
            defaultSuccessToast('The member has been removed from the team.')
          )
        }
      },
      onError: ({ error }) => {
        toast(defaultErrorToast(error.serverError || 'Unknown error.'))
      },
      onSettled: () => {
        setRemoveDialogOpen(false)
      },
    }
  )

  const handleRemoveMember = async (userId: string) => {
    if (!team) {
      return
    }

    removeMember({
      teamIdOrSlug: team.id,
      userId,
    })
  }

  return (
    <TableRow key={`${member.info.id}-${index}`}>
      <TableCell>
        <Avatar className="size-8">
          <AvatarImage src={member.info?.avatar_url} />
          <AvatarFallback>
            {member.info?.email?.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
      </TableCell>
      <TableCell className="min-w-36">
        {member.info.id === user?.id
          ? 'You'
          : (member.info.name ?? 'Anonymous')}
      </TableCell>
      <TableCell className="text-fg-tertiary">{member.info.email}</TableCell>
      <TableCell className="text-fg-secondary">
        {member.relation.added_by === user?.id ? 'You' : (addedByEmail ?? '')}
      </TableCell>
      <TableCell className="text-end">
        {!member.relation.is_default && user?.id !== member.info.id && (
          <AlertDialog
            title="Remove Member"
            description="Are you sure you want to remove this member from the team?"
            confirm="Remove"
            onConfirm={() => handleRemoveMember(member.info.id)}
            confirmProps={{
              loading: isRemoving,
            }}
            trigger={
              <Button variant="muted" size="iconSm">
                <span className="text-xs">X</span>
              </Button>
            }
            open={removeDialogOpen}
            onOpenChange={setRemoveDialogOpen}
          />
        )}
      </TableCell>
    </TableRow>
  )
}
