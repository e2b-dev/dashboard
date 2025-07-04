import { ThemeSwitcher } from '@/ui/theme-switcher'
import { cn } from '@/lib/utils'
import { Suspense } from 'react'
import Frame from '@/ui/frame'
import { DashboardSurveyPopover } from './navbar/dashboard-survey-popover'
import { CatchErrorBoundary } from '@/ui/error'
import { SidebarTrigger } from '@/ui/primitives/sidebar'

export interface DashboardPageLayoutProps {
  children: React.ReactNode
  title: string
  className?: string
  fullscreen?: boolean
  hideFrame?: boolean
  classNames?: {
    frameWrapper?: string
  }
}

export default async function DashboardPageLayout({
  children,
  title,
  className,
  classNames,
  fullscreen = false,
  hideFrame = false,
}: DashboardPageLayoutProps) {
  return (
    <div
      className={cn(
        'relative flex h-full max-h-svh pt-[var(--protected-nav-height)]'
      )}
    >
      <div className="bg-bg absolute inset-x-0 top-0 z-10 flex h-[var(--protected-nav-height)] border-b pr-3 md:pl-3">
        <div className="flex w-full items-center gap-2">
          <SidebarTrigger className="text-fg-300 h-full w-11 rounded-none border-r px-3 md:hidden" />

          <h2 className="mr-auto text-lg font-bold">{title}</h2>

          <Suspense fallback={null}>
            <ThemeSwitcher />
          </Suspense>
          {process.env.NEXT_PUBLIC_POSTHOG_KEY && <DashboardSurveyPopover />}
        </div>
      </div>

      <CatchErrorBoundary>
        <DesktopContent
          fullscreen={fullscreen}
          classNames={classNames}
          className={className}
          hideFrame={hideFrame}
        >
          {children}
        </DesktopContent>
        <MobileContent fullscreen={fullscreen} className={className}>
          {children}
        </MobileContent>
      </CatchErrorBoundary>
    </div>
  )
}

interface ContentProps {
  children: React.ReactNode
  classNames?: {
    frameWrapper?: string
  }
  className?: string
  fullscreen?: boolean
  hideFrame?: boolean
}

function DesktopContent({
  children,
  classNames,
  className,
  fullscreen,
  hideFrame,
}: ContentProps) {
  if (fullscreen) {
    return (
      <div
        className={cn(
          'relative z-0 flex-1 overflow-hidden max-md:hidden',
          className
        )}
      >
        {children}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative z-0 flex-1 max-md:hidden',
        'flex justify-center overflow-y-auto p-4 md:p-8 2xl:p-24'
      )}
    >
      {hideFrame ? (
        <div className={cn('relative h-min w-full max-w-[1200px]', className)}>
          {children}
        </div>
      ) : (
        <Frame
          classNames={{
            wrapper: cn(
              'relative flex h-fit w-full max-w-[1200px] pb-2',
              classNames?.frameWrapper
            ),
            frame: cn(className, 'bg-bg-100'),
          }}
        >
          {children}
        </Frame>
      )}
    </div>
  )
}

function MobileContent({ children, className, fullscreen }: ContentProps) {
  if (fullscreen) {
    return (
      <div
        className={cn(
          'relative z-0 flex-1 overflow-hidden md:hidden',
          className
        )}
      >
        {children}
      </div>
    )
  }

  return (
    <div className="relative z-0 flex-1 overflow-y-auto md:hidden">
      <div className={cn('relative h-min w-full', className)}>{children}</div>
    </div>
  )
}
