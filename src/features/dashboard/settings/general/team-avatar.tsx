'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useAction } from 'next-safe-action/hooks'
import { useRef, useState } from 'react'
import { USER_MESSAGES } from '@/configs/user-messages'
import {
  removeTeamProfilePictureAction,
  uploadTeamProfilePictureAction,
} from '@/core/server/actions/team-actions'
import { useDashboard } from '@/features/dashboard/context'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { useTRPC } from '@/trpc/client'
import { Avatar, AvatarImage, PatternAvatar } from '@/ui/primitives/avatar'
import { Button } from '@/ui/primitives/button'
import { EditIcon, PhotoIcon, TrashIcon } from '@/ui/primitives/icons'
import { RemovePhotoDialog } from './remove-photo-dialog'

export const TeamAvatar = () => {
  const { team } = useDashboard()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)

  const invalidateTeams = async () => {
    await queryClient.invalidateQueries({
      queryKey: trpc.teams.list.queryKey(),
    })
  }

  const { execute: uploadProfilePicture, isExecuting: isUploading } = useAction(
    uploadTeamProfilePictureAction,
    {
      onSuccess: async () => {
        await invalidateTeams()
        toast(defaultSuccessToast(USER_MESSAGES.teamLogoUpdated.message))
      },
      onError: ({ error }) => {
        if (error.validationErrors?.fieldErrors.image) {
          toast(defaultErrorToast(error.validationErrors.fieldErrors.image[0]))
          return
        }
        toast(
          defaultErrorToast(
            error.serverError || USER_MESSAGES.failedUpdateLogo.message
          )
        )
      },
      onSettled: () => {
        if (fileInputRef.current) fileInputRef.current.value = ''
      },
    }
  )

  const { execute: removeProfilePicture, isExecuting: isRemoving } = useAction(
    removeTeamProfilePictureAction,
    {
      onSuccess: async () => {
        await invalidateTeams()
        setRemoveDialogOpen(false)
        toast(defaultSuccessToast(USER_MESSAGES.teamLogoRemoved.message))
      },
      onError: ({ error }) => {
        toast(
          defaultErrorToast(
            error.serverError || USER_MESSAGES.failedRemoveLogo.message
          )
        )
      },
    }
  )

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const MAX_FILE_SIZE = 5 * 1024 * 1024

    if (file.size > MAX_FILE_SIZE) {
      toast(defaultErrorToast('Profile picture must be less than 5MB.'))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    uploadProfilePicture({ teamSlug: team.slug, image: file })
  }

  const hasPhoto = !!team.profilePictureUrl

  return (
    <div className="flex shrink-0 flex-col gap-3">
      {hasPhoto ? (
        <Avatar className="size-36">
          <AvatarImage
            src={team.profilePictureUrl || ''}
            alt={`${team.name} avatar`}
          />
        </Avatar>
      ) : (
        <PatternAvatar className="size-36" letter={team.name} />
      )}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className={hasPhoto ? '' : 'w-full'}
          onClick={() => fileInputRef.current?.click()}
          loading={isUploading}
        >
          {hasPhoto ? (
            <>
              <EditIcon className="size-4" />
              Change
            </>
          ) : (
            <>
              <PhotoIcon className="size-4" />
              Add photo
            </>
          )}
        </Button>
        {hasPhoto && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setRemoveDialogOpen(true)}
          >
            <TrashIcon className="size-4" />
          </Button>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg, image/png"
        onChange={handleUpload}
        disabled={isUploading}
      />
      <RemovePhotoDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        isRemoving={isRemoving}
        onConfirm={() => removeProfilePicture({ teamSlug: team.slug })}
      />
    </div>
  )
}
