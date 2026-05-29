'use client'

import type { KeyboardEvent, MouseEvent } from 'react'
import type { TemplateTagAssignment } from '@/core/modules/templates/models'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils/ui'
import { UndoIcon } from '@/ui/primitives/icons'
import { BuildLink } from '../build-link'

interface TagHistoryRowProps {
  assignment: TemplateTagAssignment
  teamSlug: string
  templateId: string
}

/**
 * Single historical assignment row, shared between:
 * - the collapsed history under a tag group in `tags/table.tsx`
 * - the full-history page at `tags/[tag]`
 *
 * Full-row click / Enter / Space fires the rollback demo toast. Inner BuildLink
 * still navigates to the build: the click handler early-returns when the event
 * target isn't the row itself.
 */
export function TagHistoryRow({
  assignment,
  teamSlug,
  templateId,
}: TagHistoryRowProps) {
  const { toast } = useToast()

  const rollback = () => {
    toast(defaultErrorToast('Rollback to this build: not implemented yet'))
  }

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null
    if (target?.closest('button, a, [role=button]') !== e.currentTarget) {
      return
    }
    rollback()
  }
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.currentTarget !== e.target) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      rollback()
    }
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: The row contains nested links, so a button would be invalid HTML.
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'group/childRow flex w-full items-center justify-between gap-4',
        'bg-bg py-2 cursor-pointer',
        'focus-visible:outline-none'
      )}
    >
      <div className="flex items-center gap-2 prose-body text-fg-tertiary">
        <span>Assigned to</span>
        <BuildLink
          teamSlug={teamSlug}
          templateId={templateId}
          buildId={assignment.buildId}
          assignedAt={assignment.assignedAt}
        />
      </div>
      <span
        aria-hidden
        className={cn(
          'inline-flex items-center gap-1',
          'prose-body-highlight text-fg',
          'opacity-0 group-hover/childRow:opacity-100 group-focus-visible/childRow:opacity-100',
          'group-has-[a:hover]/childRow:opacity-0',
          '[&_svg]:size-4 [&_svg]:text-icon-tertiary'
        )}
      >
        <UndoIcon />
        Rollback to this build
      </span>
    </div>
  )
}
