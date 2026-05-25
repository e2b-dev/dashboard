'use client'

import type { CellContext } from '@tanstack/react-table'
import { useState } from 'react'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils/ui'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { IconButton } from '@/ui/primitives/icon-button'
import {
  ArrowUpIcon,
  MoreActionsIcon,
  TrashIcon,
  UndoIcon,
} from '@/ui/primitives/icons'
import { BuildLink } from './build-link'
import TagDeleteDialog from './delete-dialog'
import type { TagGroup } from './types'

const SMALL_BUTTON = 'h-7 px-2.5 py-1.5'

export interface TagTableMeta {
  teamSlug: string
  templateId: string
  templateName: string
}

function getMeta(ctx: CellContext<TagGroup, unknown>): TagTableMeta {
  return ctx.table.options.meta as TagTableMeta
}

export function TagPillCell({ row }: CellContext<TagGroup, unknown>) {
  return (
    <Badge
      variant="default"
      size="sm"
      className="uppercase bg-fill pointer-events-none"
    >
      {row.original.tag}
    </Badge>
  )
}

export function BuildLinkCell(ctx: CellContext<TagGroup, unknown>) {
  const { teamSlug, templateId } = getMeta(ctx)
  const { primaryAssignment } = ctx.row.original
  return (
    <BuildLink
      teamSlug={teamSlug}
      templateId={templateId}
      buildId={primaryAssignment.buildId}
      assignedAt={primaryAssignment.assignedAt}
    />
  )
}

export function ActionsCell(ctx: CellContext<TagGroup, unknown>) {
  const { row } = ctx
  const { teamSlug, templateId, templateName } = getMeta(ctx)
  const { toast } = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const isExpanded = row.getIsExpanded()
  const group = row.original

  return (
    <div className="flex items-center justify-end gap-4 w-full">
      <div
        className={cn(
          'flex items-center gap-1 max-sm:hidden',
          isExpanded
            ? 'opacity-100'
            : // Reveal on mouse hover anywhere in the row, or when a
              // keyboard-focused descendant is inside the row.
              // `has-[:focus-visible]` (not focus-within) avoids the
              // buttons lingering after a mouse click leaves focus on them.
              'opacity-0 group-hover/row:opacity-100 group-has-[:focus-visible]/row:opacity-100'
        )}
      >
        <Button
          variant="primary"
          size="none"
          className={SMALL_BUTTON}
          onClick={(e) => {
            e.stopPropagation()
            toast(defaultErrorToast('Promote: not implemented yet'))
          }}
        >
          Promote
        </Button>
        <Button
          variant="secondary"
          size="none"
          className={SMALL_BUTTON}
          onClick={(e) => {
            e.stopPropagation()
            toast(defaultErrorToast('Rollback: not implemented yet'))
          }}
        >
          Rollback
        </Button>
      </div>

      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <IconButton
            aria-label={`Actions for tag ${group.tag}`}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreActionsIcon />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="sm:hidden"
            onSelect={() =>
              toast(defaultErrorToast('Promote: not implemented yet'))
            }
          >
            <ArrowUpIcon className="size-4" />
            Promote
          </DropdownMenuItem>
          <DropdownMenuItem
            className="sm:hidden"
            onSelect={() =>
              toast(defaultErrorToast('Rollback: not implemented yet'))
            }
          >
            <UndoIcon className="size-4" />
            Rollback
          </DropdownMenuItem>
          <DropdownMenuSeparator className="md:hidden" />
          <DropdownMenuItem
            variant="error"
            onSelect={(e) => {
              e.preventDefault()
              setMenuOpen(false)
              setDeleteOpen(true)
            }}
          >
            <TrashIcon className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TagDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        tag={group.tag}
        teamSlug={teamSlug}
        templateId={templateId}
        templateName={templateName}
      />
    </div>
  )
}
