'use client'

import { USER_MESSAGES } from '@/configs/user-messages'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { cn, exponentialSmoothing } from '@/lib/utils'
import { uploadTeamProfilePictureAction } from '@/server/team/team-actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/primitives/avatar'
import { Badge } from '@/ui/primitives/badge'
import { cardVariants } from '@/ui/primitives/card'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronsUp, ImagePlusIcon, Loader2, Pencil } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useRef, useState } from 'react'

interface ProfilePictureCardProps {
  className?: string
}

export function ProfilePictureCard({ className }: ProfilePictureCardProps) {
  const team = useSelectedTeam()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const { execute: uploadProfilePicture, isExecuting: isUploading } = useAction(
    uploadTeamProfilePictureAction,
    {
      onSuccess: () => {
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
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      },
    }
  )

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && team?.id) {
      const file = e.target.files[0]

      const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes

      if (file.size > MAX_FILE_SIZE) {
        toast(
          defaultErrorToast(
            `Profile picture must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
          )
        )

        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }

      const formData = new FormData()
      formData.append('teamId', team.id)
      formData.append('image', file)

      uploadProfilePicture({
        teamId: team.id,
        image: file,
      })
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <>
      <div
        className="relative cursor-pointer p-4 pr-0 md:p-6 md:pr-0"
        onClick={handleAvatarClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Avatar
          className={cn(
            'relative h-24 w-24',
            {
              'border-none drop-shadow-lg filter': team?.profile_picture_url,
            },
            className
          )}
        >
          <AvatarImage
            src={team?.profile_picture_url || ''}
            alt={`${team?.name}'s profile picture`}
          />
          <AvatarFallback className="bg-bg-200 relative text-2xl font-semibold">
            <ImagePlusIcon className="text-fg-500" />
            <Badge className="text-fg-300 absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap uppercase backdrop-blur-md">
              Upload <ChevronsUp className="text-accent size-4" />
            </Badge>
          </AvatarFallback>
          <AnimatePresence>
            {isHovered && !isUploading ? (
              <motion.div
                className={cn(
                  cardVariants({ variant: 'layer' }),
                  'absolute top-1/2 left-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full'
                )}
                variants={{
                  initial: {
                    opacity: 0,
                    scale: 0,
                    filter: 'blur(8px)',
                  },
                  animate: {
                    opacity: 1,
                    scale: 1,
                    filter: 'blur(0px)',
                  },
                }}
                initial="initial"
                animate="animate"
                exit="initial"
                transition={{ duration: 0.2, ease: exponentialSmoothing(5) }}
              >
                <Pencil className="h-5 w-5 text-white" />
              </motion.div>
            ) : isUploading ? (
              <motion.div
                className={cn(
                  cardVariants({ variant: 'layer' }),
                  'absolute top-1/2 left-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full'
                )}
                variants={{
                  initial: {
                    opacity: 0,
                    scale: 0,
                    filter: 'blur(8px)',
                  },
                  animate: {
                    opacity: 1,
                    scale: 1,
                    filter: 'blur(0px)',
                  },
                }}
                initial="initial"
                animate="animate"
                exit="initial"
                transition={{ duration: 0.2, ease: exponentialSmoothing(5) }}
              >
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </Avatar>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg, image/png, image/svg+xml"
        onChange={handleUpload}
        disabled={isUploading}
      />
    </>
  )
}
