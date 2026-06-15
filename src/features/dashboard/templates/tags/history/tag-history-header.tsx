'use client'

import { useState } from 'react'
import type { TemplateTagAssignment } from '@/core/modules/templates/models'
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
import { MoreActionsIcon, RemoveIcon } from '@/ui/primitives/icons'
import { MiddleTruncate } from '@/ui/primitives/middle-truncate'
import { BuildLink } from '../build-link'
import { DEFAULT_TAG_NAME } from '../constants'
import TagDeleteDialog from '../delete-dialog'
import ReassignTagDialog from '../reassign-dialog'

interface TagHistoryHeaderProps {
  tag: string
  teamSlug: string
  templateId: string
  templateName: string
  primaryAssignment: TemplateTagAssignment
  onTagDeleted: () => void | Promise<void>
  onRequestRollback?: () => void
  onReassigned?: () => void | Promise<void>
}

export function TagHistoryHeader({
  tag,
  teamSlug,
  templateId,
  templateName,
  primaryAssignment,
  onTagDeleted,
  onRequestRollback,
  onReassigned,
}: TagHistoryHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [reassignOpen, setReassignOpen] = useState(false)

  const isDefaultTag = tag === DEFAULT_TAG_NAME
  const canRollback = !!onRequestRollback

  return (
    <div
      className={cn(
        'group/row relative flex items-center gap-6',
        '-mx-3 px-3 w-[calc(100%+24px)] py-2'
      )}
    >
      <div className="flex-1 min-w-0">
        <Badge
          variant="default"
          size="sm"
          className="uppercase bg-fill max-w-full min-w-0 pointer-events-none"
        >
          <MiddleTruncate text={tag} />
        </Badge>
      </div>

      <div className="w-[178px] shrink-0">
        <BuildLink
          teamSlug={teamSlug}
          templateId={templateId}
          buildId={primaryAssignment.buildId}
          assignedAt={primaryAssignment.assignedAt}
        />
      </div>

      <div className="w-[203px] max-sm:w-4 shrink-0 flex items-center justify-end gap-4">
        <div className="flex items-center gap-1 max-sm:hidden">
          <Button
            variant="primary"
            size="small"
            aria-label={`Reassign tag ${tag} to a different build`}
            onClick={() => setReassignOpen(true)}
          >
            Reassign
          </Button>
          <Button
            variant="secondary"
            size="small"
            disabled={!canRollback}
            aria-label={
              canRollback
                ? `Rollback tag ${tag} to previous build`
                : `No previous build to rollback to for tag ${tag}`
            }
            onClick={() => onRequestRollback?.()}
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
                  : `Actions for tag ${tag}`
              }
              disabled={isDefaultTag}
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
              <RemoveIcon className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <TagDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        tag={tag}
        teamSlug={teamSlug}
        templateId={templateId}
        templateName={templateName}
        onDeleted={onTagDeleted}
      />

      <ReassignTagDialog
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        tag={tag}
        currentBuildId={primaryAssignment.buildId}
        teamSlug={teamSlug}
        templateId={templateId}
        templateName={templateName}
        surface="history-header"
        onReassigned={onReassigned}
      />
    </div>
  )
}
