'use client'

import type { CellContext } from '@tanstack/react-table'
import { useState } from 'react'
import { cn } from '@/lib/utils/ui'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { IconButton } from '@/ui/primitives/icon-button'
import { MoreActionsIcon, TrashIcon } from '@/ui/primitives/icons'
import { MiddleTruncate } from '@/ui/primitives/middle-truncate'
import { BuildLink } from './build-link'
import { DEFAULT_TAG_NAME } from './constants'
import TagDeleteDialog from './delete-dialog'
import { useTagDialog } from './tag-dialog-provider'
import type { TagGroup } from './types'

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
      className="uppercase bg-fill max-w-full min-w-0 shrink pointer-events-none"
    >
      <MiddleTruncate text={row.original.tag} />
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
  const { actions } = useTagDialog()
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const group = row.original
  const isDefaultTag = group.tag === DEFAULT_TAG_NAME
  const previousAssignment = group.assignments[1]
  const canRollback = !!previousAssignment

  return (
    <div className="flex items-center justify-end gap-4 w-full">
      <div
        className={cn(
          'flex items-center gap-1 max-sm:hidden',
          'opacity-0 group-hover/section:opacity-100 group-has-focus-visible/section:opacity-100'
        )}
      >
        <Button
          variant="primary"
          size="small"
          aria-label={`Reassign tag ${group.tag} to a different build`}
          onClick={(e) => {
            e.stopPropagation()
            actions.openReassign(group)
          }}
        >
          Reassign
        </Button>
        <Button
          variant="secondary"
          size="small"
          disabled={!canRollback}
          aria-label={
            canRollback
              ? `Rollback tag ${group.tag} to previous build`
              : `No previous build to rollback to for tag ${group.tag}`
          }
          onClick={(e) => {
            e.stopPropagation()
            if (previousAssignment) {
              actions.openRollback(group, previousAssignment, 'tags-tab')
            }
          }}
        >
          Rollback
        </Button>
      </div>

      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <IconButton
            aria-label={
              isDefaultTag
                ? 'Actions unavailable for default tag'
                : `Actions for tag ${group.tag}`
            }
            disabled={isDefaultTag}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreActionsIcon />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
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
