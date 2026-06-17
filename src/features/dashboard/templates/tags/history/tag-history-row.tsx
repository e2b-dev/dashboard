'use client'

import type { KeyboardEvent, MouseEvent } from 'react'
import type { TemplateTagAssignment } from '@/core/modules/templates/models'
import { cn } from '@/lib/utils/ui'
import { UndoIcon } from '@/ui/primitives/icons'
import { BuildLink } from '../build-link'

interface TagHistoryRowProps {
  assignment: TemplateTagAssignment
  primaryAssignment: TemplateTagAssignment
  teamSlug: string
  templateId: string
  onRequestRollback: (target: TemplateTagAssignment) => void
}

export function TagHistoryRow({
  assignment,
  primaryAssignment,
  teamSlug,
  templateId,
  onRequestRollback,
}: TagHistoryRowProps) {
  const isCurrentBuild = assignment.buildId === primaryAssignment.buildId

  const buildSummary = (
    <div className="flex items-center gap-2 prose-body text-fg-tertiary">
      <span>Assigned to</span>
      <BuildLink
        teamSlug={teamSlug}
        templateId={templateId}
        buildId={assignment.buildId}
        assignedAt={assignment.assignedAt}
      />
    </div>
  )

  if (isCurrentBuild) {
    return (
      <div className="group/childRow flex w-full items-center justify-between gap-4 bg-bg py-1.5">
        {buildSummary}
        <span
          className={cn(
            'inline-flex items-center gap-1',
            'prose-body-highlight text-fg',
            'opacity-0 group-hover/childRow:opacity-100'
          )}
        >
          Currently assigned
        </span>
      </div>
    )
  }

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null
    if (target?.closest('button, a, [role=button]') !== e.currentTarget) {
      return
    }
    onRequestRollback(assignment)
  }
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.currentTarget !== e.target) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onRequestRollback(assignment)
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
        'bg-bg py-1.5 cursor-pointer',
        'focus-visible:outline-none'
      )}
    >
      {buildSummary}
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
