'use client'

import { Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { type ReactNode, useState } from 'react'
import type { IconType } from 'react-icons'
import { FaGithub, FaGoogle } from 'react-icons/fa'
import { FiMail } from 'react-icons/fi'
import { PROTECTED_URLS } from '@/configs/urls'
import { getTeamDisplayName } from '@/core/modules/teams/utils'
import { removeTeamMemberAction } from '@/core/server/actions/team-actions'
import type { TeamMember } from '@/core/server/functions/team/types'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { formatDate } from '@/lib/utils/formatting'
import { E2BLogo } from '@/ui/brand'
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/primitives/avatar'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/ui/primitives/dialog'
import { TrashIcon } from '@/ui/primitives/icons'
import { TableCell, TableRow } from '@/ui/primitives/table'
import { useDashboard } from '../context'
import {
  isPendingTeamMember,
  isSystemAddedMember,
  shouldShowRemoveMemberAction,
} from './member-table.utils'

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
  const { team, user } = useDashboard()
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

  const handleRemoveMember = (userId: string) => {
    removeMember({ teamSlug: team.slug, userId })
  }

  const providers =
    member.info.providers
      ?.map(toMemberProvider)
      .filter((provider): provider is MemberProvider => provider !== null) ?? []

  const isCurrentUser = member.info.id === user?.id
  const isPending = isPendingTeamMember(member)
  const showRemove = shouldShowRemoveMemberAction(member, user?.id)
  const dateStr = member.info.createdAt
    ? formatDate(new Date(member.info.createdAt), 'MMM d, yyyy')
    : null
  const addedBySystem = isSystemAddedMember(member, addedByMember)

  return (
    <TableRow className="h-11">
      <NameCell
        avatarUrl={member.info.avatar_url}
        email={member.info.email}
        isCurrentUser={isCurrentUser}
        isPending={isPending}
        name={member.info.name}
      />
      <ProvidersCell isPending={isPending} providers={providers} />
      <AddedCell
        addedByMember={addedByMember}
        addedBySystem={addedBySystem}
        dateStr={dateStr}
        isRemoving={isRemoving}
        isPending={isPending}
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
  isPending,
  name,
}: {
  avatarUrl?: string
  email: string
  isCurrentUser: boolean
  isPending: boolean
  name?: string
}) => (
  <TableCell className="max-w-0">
    <div className="flex min-w-0 items-center gap-3">
      {isPending ? (
        <div className="border-stroke text-fg-tertiary flex size-8 shrink-0 items-center justify-center border opacity-50">
          <Mail className="size-4" />
        </div>
      ) : (
        <Avatar className="border-stroke size-8 shrink-0 border">
          <AvatarImage referrerPolicy="no-referrer" src={avatarUrl} />
          <AvatarFallback className="bg-bg text-xl font-bold uppercase">
            {(name?.charAt(0) ?? email.charAt(0)).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="text-fg min-w-0 truncate text-sm font-medium"
            title={isPending ? email : (name ?? 'Anonymous')}
          >
            {isPending ? email : (name ?? 'Anonymous')}
          </span>
          {isCurrentUser && !isPending ? (
            <Badge
              className="shrink-0 uppercase"
              size="sm"
              typography="regular"
              variant="default"
            >
              You
            </Badge>
          ) : null}
        </div>
        {!isPending ? (
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

const ProvidersCell = ({
  isPending,
  providers,
}: {
  isPending: boolean
  providers: MemberProvider[]
}) => (
  <TableCell>
    {isPending ? (
      <span className="text-fg-tertiary font-sans text-sm">--</span>
    ) : providers.length > 0 ? (
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

const RemoveMemberDialog = ({
  isRemoving,
  memberEmail,
  memberName,
  onRemove,
  open,
  setOpen,
  teamName,
  trigger,
}: {
  isRemoving: boolean
  memberEmail: string
  memberName?: string
  onRemove: () => void
  open: boolean
  setOpen: (v: boolean) => void
  teamName?: string | null
  trigger: ReactNode
}) => {
  const shortMemberName = memberName?.trim().split(/\s+/)[0] || memberEmail
  const fullMemberName = memberName ?? memberEmail
  const teamLabel = teamName || 'this team'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="gap-0 border-stroke p-4 pl-5 pr-8 shadow-[8px_69px_42px_0px_rgba(0,0,0,0.15),3px_31px_31px_0px_rgba(0,0,0,0.26),1px_8px_17px_0px_rgba(0,0,0,0.29)]"
        hideClose
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="min-w-0 flex-1">
            <DialogTitle className="w-full text-left">
              Remove {shortMemberName}?
            </DialogTitle>
            <DialogDescription className="prose-body mt-2 text-left">
              {fullMemberName} will be removed from {teamLabel}
            </DialogDescription>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-5">
            <DialogClose asChild>
              <Button
                className="font-sans normal-case text-fg-tertiary hover:text-fg-tertiary focus:text-fg-tertiary"
                disabled={isRemoving}
                size="slate"
                type="button"
                variant="ghost"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              className="font-sans normal-case"
              loading={isRemoving}
              onClick={onRemove}
              size="md"
              type="button"
              variant="error"
            >
              <TrashIcon className="size-4" />
              Remove
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const AddedCell = ({
  addedByMember,
  addedBySystem,
  dateStr,
  isRemoving,
  isPending,
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
  isPending: boolean
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
        {isPending ? 'Pending...' : (dateStr ?? '—')}
      </span>
      {addedBySystem ? (
        <div className="flex size-5 shrink-0 items-center justify-center">
          <E2BLogo className="text-fg-tertiary size-5" />
        </div>
      ) : (
        <Avatar className="border-stroke size-5 shrink-0 border">
          <AvatarImage
            referrerPolicy="no-referrer"
            src={addedByMember?.info.avatar_url}
          />
          <AvatarFallback className="bg-bg text-[10px] font-bold uppercase">
            {addedByMember?.info.email?.charAt(0).toUpperCase() ?? '?'}
          </AvatarFallback>
        </Avatar>
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
            <Button
              aria-label={`Remove ${memberName ?? memberEmail}`}
              className="text-fg-tertiary hover:text-fg"
              size="iconSm"
              type="button"
              variant="ghost"
            >
              <TrashIcon className="size-4" />
            </Button>
          }
        />
      ) : null}
    </div>
  </TableCell>
)
