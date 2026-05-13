'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment } from 'react'
import { getDashboardLayoutConfig, type TitleSegment } from '@/configs/layout'
import { PROTECTED_URLS } from '@/configs/urls'
import { cn } from '@/lib/utils'
import { useTRPC } from '@/trpc/client'
import ClientOnly from '@/ui/client-only'
import CopyButton from '@/ui/copy-button'
import { SidebarTrigger } from '@/ui/primitives/sidebar'
import { ThemeSwitcher } from '@/ui/theme-switcher'

interface DashboardLayoutHeaderProps {
  className?: string
  children?: React.ReactNode
}

export default function DashboardLayoutHeader({
  className,
  children,
}: DashboardLayoutHeaderProps) {
  const pathname = usePathname()
  const config = getDashboardLayoutConfig(pathname)
  const copyableValue = config.copyValue ?? null
  const webhookRoute = getWebhookRoute(pathname)

  return (
    <div
      className={cn(
        'sticky top-0 z-50 bg-bg/40 backdrop-blur-md p-3 md:p-6 flex items-end gap-2',
        {
          'border-b min-h-[var(--height-protected-navbar)+12px] md:min-h-[var(--height-protected-navbar)+24px] max-h-min':
            config.type === 'default',
          '!pb-0 min-h-protected-navbar max-h-min': config.type === 'custom',
          'border-b !pb-3 md:!pb-6':
            config.custom?.includeHeaderBottomStyles &&
            config.type === 'custom',
        },
        className
      )}
    >
      <div className="flex items-center w-full relative min-h-6 gap-1 md:gap-2">
        <SidebarTrigger className="w-7 h-7 md:hidden -translate-x-1 shrink-0" />

        <div className="min-w-0 flex-1 flex items-center gap-2">
          <h1 className="truncate min-w-0">
            {webhookRoute ? (
              <WebhookHeaderTitle
                teamSlug={webhookRoute.teamSlug}
                webhookId={webhookRoute.webhookId}
              />
            ) : (
              <HeaderTitle title={config.title} />
            )}
          </h1>
          {copyableValue && (
            <CopyButton
              value={copyableValue}
              className="text-fg-tertiary shrink-0"
              aria-label="Copy identifier"
            />
          )}
        </div>

        <ClientOnly className="flex items-center pl-2 pr-2">
          <ThemeSwitcher />
        </ClientOnly>

        {/* Ghost element - reserves width but not height */}
        <div className="h-0 overflow-visible shrink-0 flex items-center">
          {children}
        </div>
      </div>
    </div>
  )
}

const getWebhookRoute = (pathname: string) => {
  const parts = pathname.split('/')
  const teamSlug = parts[2]
  const resource = parts[3]
  const webhookId = parts[4]

  if (resource !== 'webhooks' || !teamSlug || !webhookId) return null
  return { teamSlug, webhookId }
}

function WebhookHeaderTitle({
  teamSlug,
  webhookId,
}: {
  teamSlug: string
  webhookId: string
}) {
  const trpc = useTRPC()
  const { data } = useSuspenseQuery(
    trpc.webhooks.get.queryOptions({ teamSlug, webhookId })
  )

  return (
    <span className="flex items-center gap-1">
      <Link
        href={PROTECTED_URLS.WEBHOOKS(teamSlug)}
        className="text-fg-secondary hover:text-fg transition-colors hover:underline shrink-0"
      >
        Webhooks
      </Link>
      <span className="text-fg-tertiary select-none shrink-0">/</span>
      <span className="truncate">{data.webhook.name}</span>
    </span>
  )
}

function HeaderTitle({ title }: { title: string | TitleSegment[] }) {
  if (typeof title === 'string') {
    return title
  }

  return (
    <span className="flex items-center gap-1">
      {title.map((segment, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <span className="text-fg-tertiary select-none shrink-0">/</span>
          )}
          {segment.href ? (
            <Link
              href={segment.href}
              className="text-fg-secondary hover:text-fg transition-colors hover:underline shrink-0"
            >
              {segment.label}
            </Link>
          ) : (
            <span className="truncate">{segment.label}</span>
          )}
        </Fragment>
      ))}
    </span>
  )
}
