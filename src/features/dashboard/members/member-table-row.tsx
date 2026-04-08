'use client'

import { format, parseISO } from 'date-fns'
import { Mail, Trash2 } from 'lucide-react'
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
import { E2BLogo } from '@/ui/brand'
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/primitives/avatar'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { TableCell, TableRow } from '@/ui/primitives/table'
import {
  isSystemAddedMember,
  shouldShowRemoveMemberAction,
} from './member-table.utils'
import { useDashboard } from '../context'

interface TableRowProps {
  member: TeamMember
  addedByMember?: TeamMember
}

type MemberProvider = {
  key: string
  label: string
  Icon: IconType
}

// "2025-08-20T..." -> "Aug 20, 2025"
const formatDate = (iso: string | null | undefined) => {
  if (!iso) return null
  try {
    return format(parseISO(iso), 'MMM d, yyyy')
  } catch {
    return null
  }
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

const MemberTableRow = ({ member, addedByMember }: TableRowProps) => {
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
  const isPending = providers.length === 0 && !member.info.name
  const showRemove = shouldShowRemoveMemberAction(member, user?.id)
  const dateStr = formatDate(member.info.createdAt)
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
          <span className="text-fg min-w-0 truncate text-sm font-medium">
            {isPending ? email : (name ?? 'Anonymous')}
          </span>
          {isCurrentUser && !isPending ? (
            <Badge
              className="hidden shrink-0 uppercase sm:inline-flex"
              size="sm"
              typography="regular"
              variant="default"
            >
              You
            </Badge>
          ) : null}
        </div>
        {!isPending ? (
          <span className="text-fg-tertiary block truncate text-sm">
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
      <div className="flex flex-wrap gap-1">
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
  isPending,
  memberEmail,
  memberName,
  onRemove,
  removeDialogOpen,
  setRemoveDialogOpen,
  showRemove,
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
        <AlertDialog
          confirm="Remove"
          confirmProps={{ loading: isRemoving }}
          description="Are you sure you want to remove this member from the team?"
          onConfirm={onRemove}
          onOpenChange={setRemoveDialogOpen}
          open={removeDialogOpen}
          title="Remove Member"
          trigger={
            <Button
              aria-label={`Remove ${memberName ?? memberEmail}`}
              size="iconSm"
              type="button"
              variant="ghost"
            >
              <Trash2 className="size-4" />
            </Button>
          }
        />
      ) : null}
    </div>
  </TableCell>
)

export default MemberTableRow
