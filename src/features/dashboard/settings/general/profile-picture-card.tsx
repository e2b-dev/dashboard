'use client'

import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronsUp, ImagePlusIcon, Loader2, Pencil } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useRef, useState } from 'react'
import { USER_MESSAGES } from '@/configs/user-messages'
import { uploadTeamProfilePictureAction } from '@/core/server/actions/team-actions'
import { useDashboard } from '@/features/dashboard/context'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { cn, exponentialSmoothing } from '@/lib/utils'
import { useTRPC } from '@/trpc/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/primitives/avatar'
import { Badge } from '@/ui/primitives/badge'
import { cardVariants } from '@/ui/primitives/card'

interface ProfilePictureCardProps {
  className?: string
}

export function ProfilePictureCard({ className }: ProfilePictureCardProps) {
  const { team } = useDashboard()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const { execute: uploadProfilePicture, isExecuting: isUploading } = useAction(
    uploadTeamProfilePictureAction,
    {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.teams.list.queryKey(),
        })
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
    const file = e.target.files?.[0]
    if (file) {
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

      uploadProfilePicture({
        teamSlug: team.slug,
        image: file,
      })
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <>
      <button
        type="button"
        aria-label="Upload team profile picture"
        className="relative cursor-pointer p-4 pr-0 md:p-6 md:pr-0"
        onClick={handleAvatarClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Avatar
          className={cn(
            'relative h-24 w-24',
            {
              'border-none drop-shadow-lg filter': team.profilePictureUrl,
            },
            className
          )}
        >
          <AvatarImage
            src={team.profilePictureUrl || ''}
            alt={`${team.name}'s profile picture`}
          />
          <AvatarFallback className="bg-bg-hover relative text-2xl ">
            <ImagePlusIcon className="text-fg-tertiary" />
            <Badge className="text-fg-secondary absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap uppercase backdrop-blur-md">
              Upload{' '}
              <ChevronsUp className="text-accent-main-highlight size-4" />
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
      </button>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg, image/png"
        onChange={handleUpload}
        disabled={isUploading}
      />
    </>
  )
}
