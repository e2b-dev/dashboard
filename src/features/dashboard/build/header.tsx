'use client'

import { useTRPC } from '@/trpc/client'
import { Skeleton } from '@/ui/primitives/skeleton'
import { useQuery } from '@tanstack/react-query'
import { use } from 'react'
import { useDashboard } from '../context'
import { DetailsItem, DetailsRow } from '../layouts/details-row'
import { RanFor, StartedAt, Template } from './header-cells'

interface BuildHeaderProps {
  params: PageProps<'/dashboard/[teamIdOrSlug]/templates/[templateId]/builds/[buildId]'>['params']
}

export default function BuildHeader({ params }: BuildHeaderProps) {
  const trpc = useTRPC()
  const { team } = useDashboard()
  const { templateId, buildId } = use(params)

  const { data: buildDetails, isLoading: isBuildDetailsLoading } = useQuery(
    trpc.builds.buildDetails.queryOptions({
      teamIdOrSlug: team.id,
      buildId,
    })
  )

  const isBuildDetailsReady = !isBuildDetailsLoading && buildDetails
  const isBuilding = buildDetails?.status === 'building'

  return (
    <header className="flex flex-col gap-6">
      <DetailsRow>
        <DetailsItem label="Template">
          {!isBuildDetailsReady ? (
            <Skeleton className="w-48 h-full" />
          ) : (
            <Template
              template={buildDetails.template}
              templateId={templateId}
            />
          )}
        </DetailsItem>
        <DetailsItem label="Started">
          {!isBuildDetailsReady ? (
            <Skeleton className="w-22" />
          ) : (
            <StartedAt timestamp={buildDetails.createdAt} />
          )}
        </DetailsItem>
        <DetailsItem label="Ran For">
          {!isBuildDetailsReady ? (
            <Skeleton className="w-22" />
          ) : (
            <RanFor
              createdAt={buildDetails.createdAt}
              finishedAt={buildDetails.finishedAt}
              isBuilding={isBuilding}
            />
          )}
        </DetailsItem>
      </DetailsRow>
    </header>
  )
}
