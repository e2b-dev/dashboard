'use client'

import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { TrashIcon } from '@/ui/primitives/icons'
import { TableCell, TableRow } from '@/ui/primitives/table'
import {
  Lock,
  MoreHorizontal,
  Pencil,
  Webhook as WebhookIcon,
} from 'lucide-react'
import { useState } from 'react'
import WebhookAddEditDialog from './add-edit-dialog'
import WebhookDeleteDialog from './delete-dialog'
import WebhookEditSecretDialog from './edit-secret-dialog'
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
  const [hoveredRowIndex, setHoveredRowIndex] = useState(-1)
  const [dropDownOpen, setDropDownOpen] = useState(false)

  const createdAt = webhook.createdAt
    ? new Date(webhook.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '-'

  return (
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
                  <Pencil className="size-4 text-fg-tertiary" /> Edit
                </DropdownMenuItem>
              </WebhookAddEditDialog>
              <WebhookEditSecretDialog webhook={webhook}>
                <DropdownMenuItem inset onSelect={(e) => e.preventDefault()}>
                  <Lock className="size-4 text-fg-tertiary" /> Rotate Secret
                </DropdownMenuItem>
              </WebhookEditSecretDialog>
              <WebhookDeleteDialog webhook={webhook}>
                <DropdownMenuItem
                  inset
                  variant="error"
                  onSelect={(e) => e.preventDefault()}
                >
                  <TrashIcon className="size-4" />
                  Delete
                </DropdownMenuItem>
              </WebhookDeleteDialog>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
