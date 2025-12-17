'use client'

import BuildHeader from '@/features/dashboard/build/header'
import Logs from '@/features/dashboard/build/logs'
import { useTRPC } from '@/trpc/client'
import { useQuery } from '@tanstack/react-query'
import { TRPCClientError } from '@trpc/client'
import { notFound } from 'next/navigation'
import { use } from 'react'

const REFETCH_INTERVAL_MS = 1_500

export default function BuildPage({
  params,
}: PageProps<'/dashboard/[teamIdOrSlug]/templates/[templateId]/builds/[buildId]'>) {
  const { teamIdOrSlug, templateId, buildId } = use(params)
  const trpc = useTRPC()

  const {
    data: buildDetails,
    error,
    isPending,
  } = useQuery(
    trpc.builds.buildDetails.queryOptions(
      { teamIdOrSlug, templateId, buildId },
      {
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: ({ state }) =>
          state.data?.status === 'building' ? 'always' : false,
        refetchInterval: ({ state }) =>
          state.data?.status === 'building' ? REFETCH_INTERVAL_MS : false,
        retry: (failureCount, error) => {
          if (
            error instanceof TRPCClientError &&
            error.data?.code === 'NOT_FOUND'
          ) {
            return false
          }
          return failureCount < 3
        },
      }
    )
  )

  if (error instanceof TRPCClientError && error.data?.code === 'NOT_FOUND') {
    notFound()
  }

  return (
    <div className="h-full min-h-0 flex-1 p-3 md:p-6 flex flex-col gap-6">
      <BuildHeader
        buildDetails={buildDetails}
        buildId={buildId}
        templateId={templateId}
      />
      <Logs
        buildDetails={buildDetails}
        teamIdOrSlug={teamIdOrSlug}
        templateId={templateId}
        buildId={buildId}
      />
    </div>
  )
}
