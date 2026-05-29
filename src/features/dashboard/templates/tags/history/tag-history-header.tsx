'use client'

import { useState } from 'react'
import type { TemplateTagAssignment } from '@/core/modules/templates/models'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
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
import { BuildLink } from '../build-link'
import TagDeleteDialog from '../delete-dialog'

const SMALL_BUTTON = 'h-7 px-2.5 py-1.5'

const DEFAULT_TAG_NAME = 'default'

interface TagHistoryHeaderProps {
  tag: string
  teamSlug: string
  templateId: string
  templateName: string
  primaryAssignment: TemplateTagAssignment
  /**
   * Called after the tag is successfully deleted. The history page passes a
   * handler that invalidates the assignments query for this tag and routes
   * back to the Tags list.
   */
  onTagDeleted: () => void | Promise<void>
}

export function TagHistoryHeader({
  tag,
  teamSlug,
  templateId,
  templateName,
  primaryAssignment,
  onTagDeleted,
}: TagHistoryHeaderProps) {
  const { toast } = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const isDefaultTag = tag === DEFAULT_TAG_NAME

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
          className="uppercase bg-fill pointer-events-none"
        >
          {tag}
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
            size="none"
            className={SMALL_BUTTON}
            onClick={() =>
              toast(defaultErrorToast('Reassign: not implemented yet'))
            }
          >
            Reassign
          </Button>
          <Button
            variant="secondary"
            size="none"
            className={SMALL_BUTTON}
            onClick={() =>
              toast(defaultErrorToast('Rollback: not implemented yet'))
            }
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
              <TrashIcon className="size-4" />
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
    </div>
  )
}
