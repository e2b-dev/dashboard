'use client'

import { API_KEYS_LAST_USED_FIRST_COLLECTION_DATE } from '@/configs/versioning'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { exponentialSmoothing } from '@/lib/utils'
import { deleteApiKeyAction } from '@/server/keys/key-actions'
import { TeamAPIKey } from '@/types/api.types'
import { AlertDialog } from '@/ui/alert-dialog'
import { Button } from '@/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { TableCell, TableRow } from '@/ui/primitives/table'
import { MoreHorizontal } from 'lucide-react'
import { motion } from 'motion/react'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'

interface TableRowProps {
  apiKey: TeamAPIKey
  index: number
  className?: string
}

export default function ApiKeyTableRow({
  apiKey,
  index,
  className,
}: TableRowProps) {
  const { toast } = useToast()
  const selectedTeam = useSelectedTeam()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [hoveredRowIndex, setHoveredRowIndex] = useState(-1)
  const [dropDownOpen, setDropDownOpen] = useState(false)

  const { execute: executeDeleteKey, isExecuting: isDeleting } = useAction(
    deleteApiKeyAction,
    {
      onSuccess: () => {
        toast(defaultSuccessToast('API Key has been deleted.'))
        setIsDeleteDialogOpen(false)
      },
      onError: (error) => {
        toast(
          defaultErrorToast(
            error.error.serverError || 'Failed to delete API Key.'
          )
        )
        setIsDeleteDialogOpen(false)
      },
    }
  )

  const deleteKey = () => {
    if (!selectedTeam) {
      return
    }

    executeDeleteKey({
      teamId: selectedTeam.id,
      apiKeyId: apiKey.id,
    })
  }

  const concatedKeyMask = `${apiKey.mask.prefix}${apiKey.mask.maskedValuePrefix}......${apiKey.mask.maskedValueSuffix}`

  const createdBeforeLastUsedCollection =
    new Date(apiKey.createdAt).getTime() <
    API_KEYS_LAST_USED_FIRST_COLLECTION_DATE.getTime()

  const lastUsed = apiKey.lastUsed
    ? new Date(apiKey.lastUsed).toLocaleDateString()
    : createdBeforeLastUsedCollection
      ? 'N/A'
      : 'No Usage'

  const createdBy = apiKey.createdBy?.email || 'N/A'

  return (
    <>
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete API Key"
        description="Are you sure you want to delete this API Key? This action cannot be undone."
        confirm="Delete"
        onConfirm={deleteKey}
        confirmProps={{
          disabled: isDeleting,
          loading: isDeleting,
        }}
      />

      <TableRow
        key={`${apiKey.name}-${index}`}
        onMouseEnter={() => setHoveredRowIndex(index)}
        onMouseLeave={() => setHoveredRowIndex(-1)}
        className={className}
      >
        <TableCell className="text-left flex flex-col gap-1">
          {apiKey.name}
          <span className="text-fg-tertiary pl-0.25 font-mono text-xs">
            {concatedKeyMask}
          </span>
        </TableCell>
        <TableCell className="text-fg-tertiary">{lastUsed}</TableCell>
        <TableCell className="max-w-36 truncate overflow-hidden text-right">
          <span className="max-w-full text-fg-tertiary truncate">
            {createdBy}
          </span>
        </TableCell>
        <TableCell className="text-fg-tertiary text-right">
          {apiKey.createdAt
            ? new Date(apiKey.createdAt).toLocaleDateString()
            : '-'}
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu onOpenChange={setDropDownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs" asChild>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  animate={{
                    opacity: hoveredRowIndex === index || dropDownOpen ? 1 : 0,
                  }}
                  transition={{
                    duration: 0.2,
                    ease: exponentialSmoothing(5),
                  }}
                >
                  <MoreHorizontal className="size-4" />
                </motion.button>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <DropdownMenuLabel>Danger Zone</DropdownMenuLabel>
                <DropdownMenuItem
                  inset
                  variant="error"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={isDeleting}
                >
                  X Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    </>
  )
}
