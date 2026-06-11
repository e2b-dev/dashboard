'use client'

import type { CSSProperties, ReactNode } from 'react'
import type { TemplateDetail } from '@/core/modules/templates/models'
import { getTemplateDisplayName } from '@/features/dashboard/templates/helpers'
import { formatDateParts, useTimezone } from '@/features/dashboard/timezone'
import { useClipboard } from '@/lib/hooks/use-clipboard'
import { cn } from '@/lib/utils/ui'
import { IconButton } from '@/ui/primitives/icon-button'
import { CheckmarkIcon, CopyIcon } from '@/ui/primitives/icons'
import { TemplateVisibilityDropdown } from '../visibility-dropdown'
import { OverviewSection } from './section'

interface TemplateSectionProps {
  template: TemplateDetail
  teamSlug: string
}

export function TemplateSection({ template, teamSlug }: TemplateSectionProps) {
  const { timezone } = useTimezone()
  const displayName = getTemplateDisplayName(template)

  const created = formatDateParts(template.createdAt, {
    timezone,
    format: 'date-year-time-no-seconds',
  })

  const isModified =
    template.updatedAt && template.updatedAt !== template.createdAt
  const modified = isModified
    ? formatDateParts(template.updatedAt, {
        timezone,
        format: 'date-year-time-no-seconds',
      })
    : null

  return (
    <OverviewSection label="Template" divider={false}>
      <div className="@container flex flex-col gap-1">
        <h2
          style={{ '--char-count': displayName.length } as CSSProperties}
          className="prose-value-big-fit font-mono uppercase tracking-tight break-all"
        >
          {displayName}
        </h2>
        <TemplateIdCopy templateID={template.templateID} />
      </div>

      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
        <MetaCell label="Created">
          {created ? `${created.datePart} ${created.timePart}` : '--'}
        </MetaCell>
        <MetaCell label="Modified">
          {modified ? `${modified.datePart} ${modified.timePart}` : 'Not yet'}
        </MetaCell>
        <MetaCell label="Visibility" className="ml-auto items-end">
          <TemplateVisibilityDropdown
            teamSlug={teamSlug}
            templateId={template.templateID}
            isPublic={template.public}
            displayName={displayName}
          />
        </MetaCell>
      </div>
    </OverviewSection>
  )
}

function MetaCell({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-fg-tertiary prose-label-highlight uppercase">
        {label}
      </span>
      <div className="text-fg-secondary prose-body">{children}</div>
    </div>
  )
}

function TemplateIdCopy({ templateID }: { templateID: string }) {
  const [wasCopied, copy] = useClipboard(2000)

  return (
    <div className="flex items-center gap-1">
      <span className="text-fg-secondary font-mono prose-body-numeric break-all">
        {templateID}
      </span>
      <IconButton
        aria-label={wasCopied ? 'Copied' : 'Copy template ID'}
        onClick={() => copy(templateID)}
        className="size-6"
      >
        {wasCopied ? (
          <CheckmarkIcon className="size-3.5 text-icon" />
        ) : (
          <CopyIcon className="size-3.5 text-icon-secondary" />
        )}
      </IconButton>
    </div>
  )
}
