'use client'

import { useSelectedTeam } from '@/lib/hooks/use-teams'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { deleteWebhookAction } from '@/server/webhooks/webhooks-actions'
import { AlertDialog } from '@/ui/alert-dialog'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { TableCell, TableRow } from '@/ui/primitives/table'
import { MoreHorizontal, Webhook as WebhookIcon } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import WebhookAddEditDialog from './add-edit-dialog'
import { Webhook } from './types'

interface WebhookTableRowProps {
  webhook: Webhook
  index: number
  className?: string
}

export default function WebhookTableRow({
  webhook,
  index,
  className,
}: WebhookTableRowProps) {
  const { toast } = useToast()
  const selectedTeam = useSelectedTeam()
  const [hoveredRowIndex, setHoveredRowIndex] = useState(-1)
  const [dropDownOpen, setDropDownOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const { execute: executeDeleteWebhook, isExecuting: isDeleting } = useAction(
    deleteWebhookAction,
    {
      onSuccess: () => {
        toast(defaultSuccessToast('Webhook has been deleted.'))
        setIsDeleteDialogOpen(false)
      },
      onError: (error) => {
        toast(
          defaultErrorToast(
            error.error.serverError || 'Failed to delete webhook.'
          )
        )
        setIsDeleteDialogOpen(false)
      },
    }
  )

  const deleteWebhook = () => {
    if (!selectedTeam) {
      return
    }
    executeDeleteWebhook({
      teamId: selectedTeam.id,
      webhookId: webhook.id,
    })
  }

  const createdAt = webhook.createdAt
    ? new Date(webhook.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '-'

  return (
    <>
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Webhook"
        description="Are you sure you want to delete this webhook? This action cannot be undone."
        confirm="Delete"
        onConfirm={deleteWebhook}
        confirmProps={{
          disabled: isDeleting,
          loading: isDeleting,
        }}
      />

      <TableRow
        key={`${webhook.id}-${index}`}
        onMouseEnter={() => setHoveredRowIndex(index)}
        onMouseLeave={() => setHoveredRowIndex(-1)}
        className={className}
      >
        {/* Name & URL Column */}
        <TableCell className="text-left w-[30%] max-w-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Icon Container */}
            <div className="border-stroke-default border flex items-center justify-center size-8 shrink-0">
              <WebhookIcon className="size-4 text-fg-secondary" />
            </div>

            {/* Name & URL */}
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <div className="text-fg-primary text-sm font-medium truncate">
                {webhook.name}
              </div>
              <div className="text-fg-tertiary font-mono text-xs truncate uppercase">
                {webhook.url}
              </div>
            </div>
          </div>
        </TableCell>

        {/* Events Column */}
        <TableCell className="text-left w-[50%] max-w-0">
          <div className="relative overflow-hidden h-full">
            <div className="flex gap-1 whitespace-nowrap overflow-x-hidden">
              {webhook.events.map((event) => (
                <Badge
                  key={event}
                  variant="default"
                  className="uppercase text-xs"
                >
                  {event}
                </Badge>
              ))}
            </div>
            {/* Fade out gradient overlay */}
            <div className="absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-bg to-transparent pointer-events-none" />
          </div>
        </TableCell>

        {/* Added Column */}
        <TableCell className="text-right w-[15%]">
          <span className="text-fg-tertiary text-sm">{createdAt}</span>
        </TableCell>

        {/* Actions Column */}
        <TableCell className="text-right w-[5%]">
          <DropdownMenu onOpenChange={setDropDownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <WebhookAddEditDialog mode="edit" webhook={webhook}>
                  <DropdownMenuItem inset onSelect={(e) => e.preventDefault()}>
                    Edit
                  </DropdownMenuItem>
                </WebhookAddEditDialog>
                <DropdownMenuItem
                  inset
                  variant="error"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={isDeleting}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    </>
  )
}
