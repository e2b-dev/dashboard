'use client'

import { cn } from '@/lib/utils/ui'
import { BuildDetailsDTO } from '@/server/api/models/builds.models'
import { useTRPC } from '@/trpc/client'
import CopyButton from '@/ui/copy-button'
import CopyButtonInline from '@/ui/copy-button-inline'
import { CheckIcon, CloseIcon } from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'
import { Skeleton } from '@/ui/primitives/skeleton'
import { useSuspenseQuery } from '@tanstack/react-query'
import { use } from 'react'
import { DetailsItem, DetailsRow } from '../layouts/details-row'
import { RanFor, StartedAt, Template } from './header-cells'

interface BuildHeaderProps {
  params: PageProps<'/dashboard/[teamIdOrSlug]/templates/[templateId]/builds/[buildId]'>['params']
}

export default function BuildHeader({ params }: BuildHeaderProps) {
  const trpc = useTRPC()
  const { teamIdOrSlug, templateId, buildId } = use(params)

  // refetching is handled inside the logs component
  const { data: buildDetails } = useSuspenseQuery(
    trpc.builds.buildDetails.queryOptions(
      {
        teamIdOrSlug,
        templateId,
        buildId,
      },
      {
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      }
    )
  )

  const isBuildDetailsReady = buildDetails
  const isBuilding = buildDetails?.status === 'building'

  return (
    <header className="flex flex-col gap-6">
      <DetailsRow>
        <DetailsItem label="ID">
          <CopyButtonInline value={buildId}>
            {buildId.slice(0, 6)}...{buildId.slice(-6)}
          </CopyButtonInline>
        </DetailsItem>
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
            <StartedAt timestamp={buildDetails.startedAt} />
          )}
        </DetailsItem>
        <DetailsItem label="Ran For">
          {!isBuildDetailsReady ? (
            <Skeleton className="w-22" />
          ) : (
            <RanFor
              startedAt={buildDetails.startedAt}
              finishedAt={buildDetails.finishedAt}
              isBuilding={isBuilding}
            />
          )}
        </DetailsItem>
      </DetailsRow>

      <StatusBanner
        status={buildDetails.status}
        statusMessage={buildDetails.statusMessage}
      />
    </header>
  )
}

interface StatusBannerProps {
  status: BuildDetailsDTO['status']
  statusMessage?: BuildDetailsDTO['statusMessage']
}

function StatusBanner({ status, statusMessage }: StatusBannerProps) {
  return (
    <div
      className={cn('p-2 border relative', {
        'border-stroke bg-bg-hover': status === 'building',
        'border-accent-error-highlight bg-accent-error-bg-large':
          status === 'failed',
        'border-accent-positive-highlight bg-accent-positive-bg':
          status === 'success',
      })}
    >
      <div className="flex items-center gap-1">
        {status === 'failed' ? (
          <>
            <CloseIcon className="size-3 text-accent-error-highlight" />
            <label className="prose-label uppercase text-accent-error-highlight">
              BUILD FAILED
            </label>
          </>
        ) : status === 'success' ? (
          <>
            <CheckIcon className="size-4 text-accent-positive-highlight" />
            <p className="prose-body text-fg">Build Successful</p>
          </>
        ) : (
          <>
            <Loader variant="slash" className="min-w-4" />
            <p className="prose-body text-fg">Building</p>
            <Loader variant="dots" />
          </>
        )}
      </div>

      {status === 'failed' && statusMessage && (
        <>
          <div className="max-h-28 overflow-y-auto">
            <pre className="prose-body max-md:whitespace-normal max-w-140 text-fg font-sans">
              {statusMessage}
            </pre>
          </div>
          <CopyButton
            value={statusMessage}
            className="absolute top-2 right-2"
            variant="ghost"
            size="slate"
          />
        </>
      )}
    </div>
  )
}
