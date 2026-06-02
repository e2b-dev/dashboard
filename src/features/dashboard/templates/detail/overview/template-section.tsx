'use client'

import type { TemplateDetail } from '@/core/modules/templates/models'
import { getTemplateDisplayName } from '@/features/dashboard/templates/helpers'
import { useClipboard } from '@/lib/hooks/use-clipboard'
import { formatLocalLogStyleTimestamp } from '@/lib/utils/formatting'
import { cn } from '@/lib/utils/ui'
import { IconButton } from '@/ui/primitives/icon-button'
import { CheckIcon, CopyIcon } from '@/ui/primitives/icons'
import { TemplateVisibilityDropdown } from '../visibility-dropdown'
import { OverviewSection } from './section'

interface TemplateSectionProps {
  template: TemplateDetail
  teamSlug: string
}

export function TemplateSection({ template, teamSlug }: TemplateSectionProps) {
  const [wasCopied, copy] = useClipboard(2000)
  const displayName = getTemplateDisplayName(template)

  const created = formatLocalLogStyleTimestamp(template.createdAt, {
    includeSeconds: false,
    includeYear: false,
  })

  const isModified =
    template.updatedAt && template.updatedAt !== template.createdAt
  const modified = isModified
    ? formatLocalLogStyleTimestamp(template.updatedAt, {
        includeSeconds: false,
        includeYear: false,
      })
    : null

  return (
    <OverviewSection label="Template" divider={false}>
      <div className="flex items-center gap-3">
        <h2 className="prose-value-big font-mono uppercase tracking-tight break-all">
          {template.templateID}
        </h2>
        <IconButton
          aria-label={wasCopied ? 'Copied' : 'Copy template ID'}
          onClick={() => copy(template.templateID)}
          className="size-7"
        >
          {wasCopied ? (
            <CheckIcon className="size-4 text-icon" />
          ) : (
            <CopyIcon className="size-4 text-icon-secondary" />
          )}
        </IconButton>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-fg-secondary prose-body">
        <MetaItem>
          <span className="text-fg-tertiary">Created</span>{' '}
          <span className="prose-body-regular">
            {created?.datePart ?? '--'} {created?.timePart ?? ''}
          </span>
        </MetaItem>
        <Separator />
        <MetaItem>
          {modified ? (
            <>
              <span className="text-fg-tertiary">Modified</span>{' '}
              <span className="prose-body-regular">
                {modified.datePart} {modified.timePart}
              </span>
            </>
          ) : (
            <span className="text-fg-tertiary">Not yet modified</span>
          )}
        </MetaItem>
        <Separator />
        <MetaItem>
          <span className="text-fg-tertiary">Visibility</span>{' '}
          <TemplateVisibilityDropdown
            teamSlug={teamSlug}
            templateId={template.templateID}
            isPublic={template.public}
            displayName={displayName}
          />
        </MetaItem>
      </div>
    </OverviewSection>
  )
}

function MetaItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap',
        className
      )}
    >
      {children}
    </span>
  )
}

function Separator() {
  return <span className="text-fg-tertiary select-none">·</span>
}
