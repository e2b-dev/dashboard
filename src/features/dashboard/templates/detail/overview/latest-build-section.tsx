'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { PROTECTED_URLS } from '@/configs/urls'
import type { BuildStatus } from '@/core/modules/builds/models'
import type { TemplateDefaultBuildModel } from '@/core/modules/templates/models'
import { useClipboard } from '@/lib/hooks/use-clipboard'
import { useNow } from '@/lib/hooks/use-now'
import { formatTimeAgoCompact } from '@/lib/utils/formatting'
import { cn } from '@/lib/utils/ui'
import { useTRPC } from '@/trpc/client'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { CheckIcon, CloseIcon, CopyIcon } from '@/ui/primitives/icons'
import { OverviewSection } from './section'
import { TemplateSpecs } from './template-specs'

interface LatestBuildSectionProps {
  templateId: string
  teamSlug: string
}

export function LatestBuildSection({
  templateId,
  teamSlug,
}: LatestBuildSectionProps) {
  const trpc = useTRPC()

  const { data } = useSuspenseQuery(
    trpc.templates.getDefaultBuild.queryOptions({ teamSlug, templateId })
  )

  if (!data.build) {
    return (
      <OverviewSection label="Latest build" labelBadge={<DefaultTagBadge />}>
        <p className="text-fg-tertiary prose-body">
          No build tagged{' '}
          <code className="text-fg-secondary font-mono">default</code> yet.
          Build the template and tag it{' '}
          <code className="text-fg-secondary font-mono">default</code> to
          populate this section.
        </p>
      </OverviewSection>
    )
  }

  const build = data.build

  return (
    <OverviewSection label="Latest build" labelBadge={<DefaultTagBadge />}>
      <div className="flex flex-col md:flex-row items-start gap-x-8 gap-y-4">
        <div className="flex flex-col gap-2 min-w-0">
          <BuildAgo timestamp={build.createdAt} />
          <BuildStatusBadge status={build.status} />
        </div>
        <BuildIdRow
          teamSlug={teamSlug}
          templateId={templateId}
          buildId={build.buildID}
        />
      </div>
      <TemplateSpecs build={build} className="mt-2" />
    </OverviewSection>
  )
}

function DefaultTagBadge() {
  return (
    <Badge variant="default" size="sm" className="uppercase font-mono">
      default
    </Badge>
  )
}

function BuildAgo({ timestamp }: { timestamp: number }) {
  const now = useNow(30_000)

  return (
    <span className="prose-value-big font-mono uppercase text-fg whitespace-nowrap">
      {formatTimeAgoCompact(now - timestamp).toUpperCase()}
    </span>
  )
}

function BuildStatusBadge({ status }: { status: BuildStatus }) {
  const config: Record<
    BuildStatus,
    {
      label: string
      variant: 'default' | 'positive' | 'error'
      icon: React.ReactNode
    }
  > = {
    building: {
      label: 'Building',
      variant: 'default',
      icon: null,
    },
    success: {
      label: 'Success',
      variant: 'positive',
      icon: <CheckIcon className="size-3 scale-125" />,
    },
    failed: {
      label: 'Failed',
      variant: 'error',
      icon: <CloseIcon className="size-3" />,
    },
  }

  const { label, icon, variant } = config[status]
  return (
    <Badge
      variant={variant}
      size="md"
      className={cn(
        'w-fit uppercase',
        variant === 'default' && 'bg-bg-inverted/10'
      )}
    >
      {icon}
      {label}
    </Badge>
  )
}

function BuildIdRow({
  teamSlug,
  templateId,
  buildId,
}: {
  teamSlug: string
  templateId: string
  buildId: string
}) {
  const [wasCopied, copy] = useClipboard(2000)
  const truncated = `${buildId.slice(0, 7)}...${buildId.slice(-5)}`

  return (
    <div className="flex items-center gap-2 rounded border border-stroke bg-bg pl-3 pr-1 py-1 min-w-0 flex-1">
      <button
        type="button"
        onClick={() => copy(buildId)}
        aria-label={wasCopied ? 'Copied build ID' : 'Copy build ID'}
        className="group/copy relative inline-flex min-w-0 flex-1 items-center text-left text-fg-secondary font-mono prose-body-numeric hover:text-fg transition-colors cursor-pointer"
      >
        <span className="truncate">{truncated}</span>
        <span
          className={cn(
            'ml-2 opacity-0 group-hover/copy:opacity-100 transition-opacity',
            wasCopied && 'opacity-100'
          )}
          aria-hidden="true"
        >
          {wasCopied ? (
            <CheckIcon className="size-3 text-icon" />
          ) : (
            <CopyIcon className="size-3 text-icon-secondary" />
          )}
        </span>
      </button>
      <Button asChild variant="tertiary" size="none" className="px-3 py-1.5">
        <Link
          href={PROTECTED_URLS.TEMPLATE_BUILD(teamSlug, templateId, buildId)}
        >
          Open
        </Link>
      </Button>
    </div>
  )
}

export type { TemplateDefaultBuildModel }
