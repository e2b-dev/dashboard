'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type ReactElement, useRef, useState } from 'react'
import { USER_MESSAGES } from '@/configs/user-messages'
import { useDashboard } from '@/features/dashboard/context'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { useTRPC } from '@/trpc/client'
import { Avatar, AvatarImage, PatternAvatar } from '@/ui/primitives/avatar'
import { Button } from '@/ui/primitives/button'
import { IconButton } from '@/ui/primitives/icon-button'
import { EditIcon, PhotoIcon, TrashIcon } from '@/ui/primitives/icons'
import { RemovePhotoDialog } from './remove-photo-dialog'

const MAX_PROFILE_PICTURE_SIZE_BYTES = 5 * 1024 * 1024

// Converts a file into a base64 payload string; example: File("logo.png") -> "iVBORw0KGgo..."
const fileToBase64 = (file: File): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null
      resolve(result?.split(',')[1] ?? '')
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

export const TeamAvatar = (): ReactElement => {
  const { team } = useDashboard()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const hasPhoto = Boolean(team.profilePictureUrl)
  const UploadIcon = hasPhoto ? EditIcon : PhotoIcon
  const uploadLabel = hasPhoto ? 'Change' : 'Add photo'

  const resetFileInput = (): void => {
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const invalidateTeams = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: trpc.teams.list.queryKey(),
    })
  }

  const uploadProfilePictureMutation = useMutation(
    trpc.teams.uploadProfilePicture.mutationOptions({
      onSuccess: async () => {
        await invalidateTeams()
        toast(defaultSuccessToast(USER_MESSAGES.teamLogoUpdated.message))
      },
      onError: (error) => {
        toast(
          defaultErrorToast(
            error.message || USER_MESSAGES.failedUpdateLogo.message
          )
        )
      },
      onSettled: resetFileInput,
    })
  )

  const removeProfilePictureMutation = useMutation(
    trpc.teams.removeProfilePicture.mutationOptions({
      onSuccess: async () => {
        await invalidateTeams()
        setRemoveDialogOpen(false)
        toast(defaultSuccessToast(USER_MESSAGES.teamLogoRemoved.message))
      },
      onError: (error) => {
        toast(
          defaultErrorToast(
            error.message || USER_MESSAGES.failedRemoveLogo.message
          )
        )
      },
    })
  )

  const handleUpload = async ({
    target,
  }: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = target.files?.[0]
    if (!file) return

    if (file.size > MAX_PROFILE_PICTURE_SIZE_BYTES) {
      toast(defaultErrorToast('Profile picture must be less than 5MB.'))
      resetFileInput()
      return
    }

    try {
      const base64 = await fileToBase64(file)
      uploadProfilePictureMutation.mutate({
        teamSlug: team.slug,
        image: {
          base64,
          name: file.name,
          type: file.type,
        },
      })
    } catch {
      toast(defaultErrorToast('Failed to read file. Please try again.'))
      resetFileInput()
    }
  }

  const handleUploadClick = (): void => fileInputRef.current?.click()
  const handleRemoveClick = (): void => setRemoveDialogOpen(true)
  const handleRemoveConfirm = (): void =>
    removeProfilePictureMutation.mutate({ teamSlug: team.slug })

  return (
    <div className="flex shrink-0 w-36 flex-col gap-2">
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
          variant="secondary"
          className={
            hasPhoto
              ? 'prose-body-highlight w-[100px] gap-1 pl-2.5 pr-3 font-sans normal-case'
              : 'prose-body-highlight w-full gap-1 pl-2.5 pr-3 font-sans normal-case'
          }
          onClick={handleUploadClick}
          loading={
            uploadProfilePictureMutation.isPending ? 'Uploading...' : undefined
          }
        >
          <UploadIcon className="size-4" />
          {uploadLabel}
        </Button>
        {hasPhoto && (
          <IconButton
            aria-label="Remove profile photo"
            variant="secondary"
            onClick={handleRemoveClick}
          >
            <TrashIcon className="size-4" />
          </IconButton>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg, image/png"
        onChange={handleUpload}
        disabled={uploadProfilePictureMutation.isPending}
      />
      <RemovePhotoDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        isRemoving={removeProfilePictureMutation.isPending}
        onConfirm={handleRemoveConfirm}
      />
    </div>
  )
}
