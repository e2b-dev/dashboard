'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { useTRPC } from '@/trpc/client'
import { LatestBuildSection } from './latest-build-section'
import { SandboxesStartedSection } from './sandboxes-started-section'
import { TemplateSection } from './template-section'

interface TemplateOverviewProps {
  templateId: string
}

export default function TemplateOverview({
  templateId,
}: TemplateOverviewProps) {
  const trpc = useTRPC()

  const { data } = useSuspenseQuery(
    trpc.templates.getTemplate.queryOptions({ templateId })
  )

  const template = data.template

  return (
    <div className="flex flex-col gap-8">
      <TemplateSection template={template} />
      <LatestBuildSection templateId={templateId} />
      <SandboxesStartedSection spawnCount={template.spawnCount} />
    </div>
  )
}
