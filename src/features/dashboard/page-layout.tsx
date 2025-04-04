import { ThemeSwitcher } from '@/ui/theme-switcher'
import { cn } from '@/lib/utils'
import { Suspense } from 'react'
import SidebarMobile from './sidebar/sidebar-mobile'
import Frame from '@/ui/frame'
import { DashboardSurveyPopover } from './navbar/dashboard-survey-popover'
import { CatchErrorBoundary } from '@/ui/error'

interface DashboardPageLayoutProps {
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
          <Suspense fallback={null}>
            <SidebarMobile className="h-full border-r px-3 md:hidden" />
          </Suspense>

          <h2 className="mr-auto text-lg font-bold">{title}</h2>

          <Suspense fallback={null}>
            <ThemeSwitcher />
          </Suspense>
          <DashboardSurveyPopover />
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
        <MobileContent className={className}>{children}</MobileContent>
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
  return (
    <div
      className={cn(
        'relative z-0 flex-1 max-md:hidden',
        fullscreen
          ? 'overflow-hidden'
          : 'flex justify-center overflow-y-auto p-4 xl:py-[min(6%,200px)]'
      )}
    >
      {fullscreen ? (
        <div className={cn('h-full', className)}>{children}</div>
      ) : hideFrame ? (
        <div
          className={cn(
            'relative flex h-fit w-full max-w-[1200px] pb-2',
            className
          )}
        >
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

function MobileContent({ children, className }: ContentProps) {
  return (
    <div
      className={cn('relative z-0 flex-1 overflow-y-auto md:hidden', className)}
    >
      {children}
    </div>
  )
}
