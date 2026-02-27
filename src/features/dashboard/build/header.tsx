'use client'

import { cn } from '@/lib/utils/ui'
import type { BuildDetailsDTO } from '@/server/api/models/builds.models'
import CopyButton from '@/ui/copy-button'
import CopyButtonInline from '@/ui/copy-button-inline'
import { CheckIcon, CloseIcon } from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'
import { Skeleton } from '@/ui/primitives/skeleton'
import { DetailsItem, DetailsRow } from '../layouts/details-row'
import { RanFor, StartedAt, Template } from './header-cells'

interface BuildHeaderProps {
  buildDetails: BuildDetailsDTO | undefined
  buildId: string
  templateId: string
}

export default function BuildHeader({
  buildDetails,
  buildId,
  templateId,
}: BuildHeaderProps) {
  const isLoading = !buildDetails
  const isBuilding = buildDetails?.status === 'building'

  return (
    <header className="flex flex-col gap-6">
      <DetailsRow>
        <DetailsItem label="ID">
          <CopyButtonInline
            value={buildId}
            className="font-mono prose-table-numeric text-fg-secondary"
          >
            {buildId}
          </CopyButtonInline>
        </DetailsItem>
        <DetailsItem label="Template">
          {isLoading ? (
            <Skeleton className="w-48 h-5" />
          ) : (
            <Template
              template={buildDetails.template}
              templateId={templateId}
            />
          )}
        </DetailsItem>
        <DetailsItem label="Started">
          {isLoading ? (
            <Skeleton className="w-36 h-5" />
          ) : (
            <StartedAt timestamp={buildDetails.startedAt} />
          )}
        </DetailsItem>
        <DetailsItem label={isBuilding ? 'Running for' : 'Finished'}>
          {isLoading ? (
            <Skeleton className="w-36 h-5" />
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
        status={buildDetails?.status}
        statusMessage={buildDetails?.statusMessage}
      />
    </header>
  )
}

interface StatusBannerProps {
  status: BuildDetailsDTO['status'] | undefined
  statusMessage?: BuildDetailsDTO['statusMessage']
}

function StatusBanner({ status, statusMessage }: StatusBannerProps) {
  return (
    <div
      className={cn('p-2 border relative', {
        'border-stroke bg-bg-hover': !status || status === 'building',
        'border-accent-error-highlight bg-accent-error-bg-large':
          status === 'failed',
        'border-accent-positive-highlight bg-accent-positive-bg':
          status === 'success',
      })}
    >
      <div className="flex items-center gap-1">
        {!status ? (
          <>
            <Loader variant="slash" className="min-w-4" />
            <p className="prose-body text-fg">Getting Build</p>
            <Loader variant="dots" />
          </>
        ) : status === 'failed' ? (
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
            <p className="prose-body max-w-140 text-fg">{statusMessage}</p>
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
