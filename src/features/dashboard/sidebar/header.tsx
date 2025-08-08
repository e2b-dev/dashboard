'use client'

import useKeydown from '@/lib/hooks/use-keydown'
import { cn } from '@/lib/utils'
import { E2BLogo } from '@/ui/brand'
import ClientOnly from '@/ui/client-only'
import { Button } from '@/ui/primitives/button'
import { SidebarHeader, SidebarMenu, useSidebar } from '@/ui/primitives/sidebar'
import ShortcutTooltip from '@/ui/shortcut-tooltip'
import { ArrowLeftToLine, ArrowRightFromLine } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import DashboardSidebarCommand from './command'
import DashboardSidebarMenu from './menu'

export default function DashboardSidebarHeader() {
  const { toggleSidebar, open, openMobile } = useSidebar()

  const isOpen = open || openMobile

  useKeydown((event) => {
    if (event.key === 's' && event.ctrlKey) {
      event.preventDefault()
      toggleSidebar()
    }
  })

  return (
    <SidebarHeader className="p-0 gap-0">
      <div
        className={cn('flex w-full items-center justify-between p-3 h-12', {
          // When the sidebar is closing, we want to stick the logo to the right.
          'justify-end p-2 pb-0': !isOpen,
        })}
      >
        {/* When the sidebar is closing, we want the logo to fade out AND be removed from the DOM. */}
        <AnimatePresence initial={false} mode="popLayout">
          {isOpen && (
            <motion.span
              variants={{
                visible: { opacity: 1, filter: 'blur(0px)' },
                hidden: { opacity: 0, filter: 'blur(4px)' },
              }}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <ClientOnly className="flex items-center gap-1.5">
                <E2BLogo className="size-6" />
                <span className="prose-headline-small">E2B</span>
              </ClientOnly>
            </motion.span>
          )}
        </AnimatePresence>
        <ShortcutTooltip keys={['ctrl', 's']}>
          <Button
            variant="ghost"
            className="text-fg-tertiary"
            size="icon"
            onClick={toggleSidebar}
          >
            {isOpen ? (
              <ArrowLeftToLine className="size-4" />
            ) : (
              <ArrowRightFromLine className="size-4" />
            )}
          </Button>
        </ShortcutTooltip>
      </div>
      <SidebarMenu className="p-0 gap-0">
        <DashboardSidebarMenu />
        <DashboardSidebarCommand />
      </SidebarMenu>
    </SidebarHeader>
  )
}
