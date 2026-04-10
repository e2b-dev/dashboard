'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
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
import { EditIcon, PhotoIcon, TrashIcon } from '@/ui/primitives/icons'
import { RemovePhotoDialog } from './remove-photo-dialog'

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null
      resolve(result?.split(',')[1] ?? '')
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

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
      onSettled: () => {
        if (fileInputRef.current) fileInputRef.current.value = ''
      },
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const MAX_FILE_SIZE = 5 * 1024 * 1024

    if (file.size > MAX_FILE_SIZE) {
      toast(defaultErrorToast('Profile picture must be less than 5MB.'))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    let base64: string
    try {
      base64 = await fileToBase64(file)
    } catch {
      toast(defaultErrorToast('Failed to read file. Please try again.'))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    uploadProfilePictureMutation.mutate({
      teamSlug: team.slug,
      image: {
        base64,
        name: file.name,
        type: file.type,
      },
    })
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
          loading={uploadProfilePictureMutation.isPending}
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
        disabled={uploadProfilePictureMutation.isPending}
      />
      <RemovePhotoDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        isRemoving={removeProfilePictureMutation.isPending}
        onConfirm={() =>
          removeProfilePictureMutation.mutate({ teamSlug: team.slug })
        }
      />
    </div>
  )
}
