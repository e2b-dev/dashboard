'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import ResourceUsage from '@/features/dashboard/common/resource-usage'
import {
  DetailsItem,
  DetailsRow,
} from '@/features/dashboard/layouts/details-row'
import { formatLocalLogStyleTimestamp } from '@/lib/utils/formatting'
import { useTRPC } from '@/trpc/client'
import { TemplateVisibilityDropdown } from './visibility-dropdown'

interface TemplateDetailHeaderProps {
  teamSlug: string
  templateId: string
}

const NULL_BUILD_ID = '00000000-0000-0000-0000-000000000000'

/**
 * Overview-tab header: the 5-cell DetailsRow.
 *
 * The fetch here is deduped with the layout-level TemplateTitleBinder
 * (same query key), so this renders synchronously off the cache when
 * the user lands on Overview after the binder has already resolved.
 *
 * 404 handling lives in the binder, not here \u2014 by the time this
 * component renders, the template is guaranteed to exist.
 */
export default function TemplateDetailHeader({
  teamSlug,
  templateId,
}: TemplateDetailHeaderProps) {
  const trpc = useTRPC()

  const { data } = useSuspenseQuery(
    trpc.templates.getTemplate.queryOptions(
      { teamSlug, templateId },
      {
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      }
    )
  )

  const template = data.template
  const hasReadyBuild = template.buildID !== NULL_BUILD_ID

  const displayName =
    template.names.find((n) => !n.includes('/')) ??
    template.names[0] ??
    template.templateID

  const created = formatLocalLogStyleTimestamp(template.createdAt, {
    includeSeconds: false,
    includeYear: true,
  })
  const updated = formatLocalLogStyleTimestamp(template.updatedAt, {
    includeSeconds: false,
    includeYear: true,
  })

  return (
    <DetailsRow>
      <DetailsItem label="Memory">
        {hasReadyBuild ? (
          <ResourceUsage type="mem" total={template.memoryMB} mode="simple" />
        ) : (
          <span className="text-fg-tertiary font-mono">--</span>
        )}
      </DetailsItem>
      <DetailsItem label="CPU">
        {hasReadyBuild ? (
          <ResourceUsage type="cpu" total={template.cpuCount} mode="simple" />
        ) : (
          <span className="text-fg-tertiary font-mono">--</span>
        )}
      </DetailsItem>
      <DetailsItem label="Created">
        <span className="font-mono whitespace-nowrap prose-body-numeric">
          <span className="text-fg-tertiary">{created?.datePart ?? '--'}</span>{' '}
          {created?.timePart ?? '--'}{' '}
          <span className="text-fg-tertiary">
            {created?.timezonePart ?? ''}
          </span>
        </span>
      </DetailsItem>
      <DetailsItem label="Updated">
        <span className="font-mono whitespace-nowrap prose-body-numeric">
          <span className="text-fg-tertiary">{updated?.datePart ?? '--'}</span>{' '}
          {updated?.timePart ?? '--'}{' '}
          <span className="text-fg-tertiary">
            {updated?.timezonePart ?? ''}
          </span>
        </span>
      </DetailsItem>
      <DetailsItem label="Visibility">
        <TemplateVisibilityDropdown
          teamSlug={teamSlug}
          templateId={template.templateID}
          isPublic={template.public}
          displayName={displayName}
        />
      </DetailsItem>
    </DetailsRow>
  )
}
