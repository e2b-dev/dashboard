'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { IconType } from 'react-icons'
import { FaGithub, FaGoogle } from 'react-icons/fa'
import { FiMail } from 'react-icons/fi'
import { PROTECTED_URLS } from '@/configs/urls'
import type { TeamMember } from '@/core/modules/teams/models'
import { getTeamDisplayName } from '@/core/modules/teams/utils'
import { UserAvatar } from '@/features/dashboard/shared'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { formatDate } from '@/lib/utils/formatting'
import { useTRPC } from '@/trpc/client'
import { E2BLogo } from '@/ui/brand'
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/primitives/avatar'
import { Badge } from '@/ui/primitives/badge'
import { IconButton } from '@/ui/primitives/icon-button'
import { TrashIcon } from '@/ui/primitives/icons'
import { TableCell, TableRow } from '@/ui/primitives/table'
import { useDashboard } from '../context'
import {
  shouldShowRemoveMemberAction,
  wasAddedBySystem,
} from './member-table.utils'
import { RemoveMemberDialog } from './remove-member-dialog'

interface TableRowProps {
  member: TeamMember
  addedByMember?: TeamMember
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
  if (normalized === 'google')
    return { key: normalized, label: 'Google', Icon: FaGoogle }
  if (normalized === 'github')
    return { key: normalized, label: 'GitHub', Icon: FaGithub }
  if (normalized === 'email')
    return { key: normalized, label: 'Email', Icon: FiMail }
  return null
}

export const MemberTableRow = ({ member, addedByMember }: TableRowProps) => {
  const { toast } = useToast()
  const router = useRouter()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { team, user } = useDashboard()
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)

  const removeMemberMutation = useMutation(
    trpc.teams.removeMember.mutationOptions({
      onSuccess: async (_, input) => {
        if (input.userId === user?.id) {
          await queryClient.invalidateQueries({
            queryKey: trpc.teams.list.queryKey(),
          })

          router.push(PROTECTED_URLS.DASHBOARD)

          toast(defaultSuccessToast('You have left the team.'))
        } else {
          await queryClient.invalidateQueries({
            queryKey: trpc.teams.members.queryKey({ teamSlug: team.slug }),
          })
          toast(
            defaultSuccessToast('The member has been removed from the team.')
          )
        }
      },
      onError: (error) => {
        toast(defaultErrorToast(error.message || 'Unknown error.'))
      },
      onSettled: () => {
        setRemoveDialogOpen(false)
      },
    })
  )

  const handleRemoveMember = (userId: string) => {
    removeMemberMutation.mutate({ teamSlug: team.slug, userId })
  }

  const providers =
    member.info.providers
      ?.map(toMemberProvider)
      .filter((provider): provider is MemberProvider => provider !== null) ?? []

  const isCurrentUser = member.info.id === user?.id
  const showRemove = shouldShowRemoveMemberAction(member, user?.id)
  const dateStr = member.info.createdAt
    ? formatDate(new Date(member.info.createdAt), 'MMM d, yyyy')
    : null
  const addedBySystem = wasAddedBySystem(member, addedByMember)

  return (
    <TableRow className="h-11">
      <NameCell
        avatarUrl={member.info.avatar_url}
        email={member.info.email}
        isCurrentUser={isCurrentUser}
        name={member.info.name}
      />
      <ProvidersCell providers={providers} />
      <AddedCell
        addedByMember={addedByMember}
        addedBySystem={addedBySystem}
        dateStr={dateStr}
        isRemoving={removeMemberMutation.isPending}
        memberEmail={member.info.email}
        memberName={member.info.name}
        onRemove={() => handleRemoveMember(member.info.id)}
        removeDialogOpen={removeDialogOpen}
        setRemoveDialogOpen={setRemoveDialogOpen}
        showRemove={showRemove}
        teamName={getTeamDisplayName(team)}
      />
    </TableRow>
  )
}

const NameCell = ({
  avatarUrl,
  email,
  isCurrentUser,
  name,
}: {
  avatarUrl?: string
  email: string
  isCurrentUser: boolean
  name?: string
}) => (
  <TableCell className="max-w-0">
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="border-stroke size-8 shrink-0 border">
        <AvatarImage referrerPolicy="no-referrer" src={avatarUrl} />
        <AvatarFallback className="bg-bg text-xl font-bold uppercase">
          {(name?.charAt(0) ?? email.charAt(0)).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="text-fg min-w-0 truncate text-sm font-medium"
            title={name ?? email}
          >
            {name ?? email}
          </span>
          {isCurrentUser ? (
            <Badge className="shrink-0 uppercase" size="sm" variant="default">
              You
            </Badge>
          ) : null}
        </div>
        {name ? (
          <span
            className="text-fg-tertiary block truncate text-sm"
            title={email}
          >
            {email}
          </span>
        ) : null}
      </div>
    </div>
  </TableCell>
)

const ProvidersCell = ({ providers }: { providers: MemberProvider[] }) => (
  <TableCell>
    {providers.length > 0 ? (
      <>
        <div className="flex flex-wrap gap-1 md:hidden">
          {providers.map(({ key, label, Icon }) => (
            <Badge
              className="bg-bg-highlight text-fg-tertiary h-[18px] gap-0.5 uppercase prose-label-numeric"
              key={key}
              size="sm"
            >
              <Icon className="size-3 shrink-0" />
              {label}
            </Badge>
          ))}
        </div>
        <div className="hidden flex-wrap gap-1 md:flex">
          {providers.map(({ key, label, Icon }) => (
            <Badge
              className="bg-bg-highlight text-fg-tertiary h-[18px] gap-0.5 uppercase prose-label-numeric"
              key={key}
              size="sm"
            >
              <Icon className="size-3 shrink-0" />
              {label}
            </Badge>
          ))}
        </div>
      </>
    ) : (
      <span className="text-fg-tertiary font-sans text-sm">--</span>
    )}
  </TableCell>
)

const AddedCell = ({
  addedByMember,
  addedBySystem,
  dateStr,
  isRemoving,
  memberEmail,
  memberName,
  onRemove,
  removeDialogOpen,
  setRemoveDialogOpen,
  showRemove,
  teamName,
}: {
  addedByMember?: TeamMember
  addedBySystem: boolean
  dateStr: string | null
  isRemoving: boolean
  memberEmail: string
  memberName?: string
  onRemove: () => void
  removeDialogOpen: boolean
  setRemoveDialogOpen: (v: boolean) => void
  showRemove: boolean
  teamName?: string | null
}) => (
  <TableCell>
    <div className="flex items-center gap-6">
      <span className="text-fg-tertiary w-[92px] shrink-0 text-sm">
        {dateStr ?? '—'}
      </span>
      {addedBySystem ? (
        <div className="flex size-5 shrink-0 items-center justify-center">
          <E2BLogo className="text-fg-tertiary size-5" />
        </div>
      ) : (
        <UserAvatar
          url={addedByMember?.info.avatar_url}
          email={addedByMember?.info.email}
        />
      )}
      {showRemove ? (
        <RemoveMemberDialog
          isRemoving={isRemoving}
          memberEmail={memberEmail}
          memberName={memberName}
          onRemove={onRemove}
          open={removeDialogOpen}
          setOpen={setRemoveDialogOpen}
          teamName={teamName}
          trigger={
            <IconButton aria-label={`Remove ${memberName ?? memberEmail}`}>
              <TrashIcon />
            </IconButton>
          }
        />
      ) : null}
    </div>
  </TableCell>
)
