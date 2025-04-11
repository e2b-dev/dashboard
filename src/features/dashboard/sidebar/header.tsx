'use client'

import { cn } from '@/lib/utils'
import Logo from '@/ui/logo'
import { Button } from '@/ui/primitives/button'
import {
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/ui/primitives/sidebar'
import { ArrowLeftToLine, ArrowRightFromLine } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import DashboardSidebarMenu from './menu'
import DashboardSidebarCommand from './command'

export default function DashboardSidebarHeader() {
  const { toggleSidebar, open, openMobile } = useSidebar()

  const isOpen = open || openMobile

  return (
    <SidebarHeader className="p-0">
      <div
        className={cn(
          'flex h-[var(--protected-nav-height)] w-full items-center justify-between border-b px-2',
          {
            // When the sidebar is closing, we want to stick the logo to the right.
            'justify-end': !isOpen,
          }
        )}
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
              <Logo />
            </motion.span>
          )}
        </AnimatePresence>
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          {isOpen ? (
            <ArrowLeftToLine className="size-5" />
          ) : (
            <ArrowRightFromLine className="size-5" />
          )}
        </Button>
      </div>
      <SidebarGroup className="pt-0">
        <SidebarMenu className="flex flex-col gap-2">
          <DashboardSidebarMenu />
          <DashboardSidebarCommand />
        </SidebarMenu>
      </SidebarGroup>
    </SidebarHeader>
  )
}
