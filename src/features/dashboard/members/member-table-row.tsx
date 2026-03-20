'use client'

import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import type { IconType } from 'react-icons'
import { FaGithub, FaGoogle } from 'react-icons/fa'
import { FiMail } from 'react-icons/fi'
import { PROTECTED_URLS } from '@/configs/urls'
import { removeTeamMemberAction } from '@/core/server/actions/team-actions'
import type { TeamMember } from '@/core/server/functions/team/types'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { AlertDialog } from '@/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/primitives/avatar'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { TableCell, TableRow } from '@/ui/primitives/table'
import { useDashboard } from '../context'

interface TableRowProps {
  member: TeamMember
  addedByEmail?: string
  index: number
}

type MemberProvider = {
  key: string
  label: string
  Icon: IconType
}

function normalizeProvider(provider: string): string {
  const value = provider.toLowerCase()
  if (value.includes('google')) return 'google'
  if (value.includes('github')) return 'github'
  if (value.includes('email')) return 'email'
  return value
}

function toMemberProvider(provider: string): MemberProvider | null {
  const normalized = normalizeProvider(provider)
  if (normalized === 'google') {
    return { key: normalized, label: 'Google', Icon: FaGoogle }
  }
  if (normalized === 'github') {
    return { key: normalized, label: 'GitHub', Icon: FaGithub }
  }
  if (normalized === 'email') {
    return { key: normalized, label: 'Email', Icon: FiMail }
  }
  return null
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
    removeMember({
      teamSlug: team.slug,
      userId,
    })
  }

  const providers =
    member.info.providers
      ?.map(toMemberProvider)
      .filter((provider): provider is MemberProvider => provider !== null) ?? []

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
      <TableCell>
        {providers.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {providers.map(({ key, label, Icon }) => (
              <Badge
                key={key}
                size="sm"
                className="bg-bg-highlight text-fg-tertiary uppercase prose-label-numeric"
              >
                <Icon className="size-3.5 mr-0.5" />
                {label}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-fg-muted">-</span>
        )}
      </TableCell>
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
