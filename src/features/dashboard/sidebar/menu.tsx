'use client'

import { Portal } from '@radix-ui/react-portal'
import { useState } from 'react'
import { SIGN_OUT_URL } from '@/configs/urls'
import { cn } from '@/lib/utils'
import { E2BLogo } from '@/ui/brand'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { LogOutIcon, UnpackIcon } from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'
import { SidebarMenuButton, SidebarMenuItem } from '@/ui/primitives/sidebar'

interface DashboardSidebarMenuProps {
  // Hidden in env-key mode (E2B_API_KEY): the deployment is permanently
  // authenticated and there is no cookie to clear.
  showSignOut: boolean
}

export default function DashboardSidebarMenu({
  showSignOut,
}: DashboardSidebarMenuProps) {
  // Stays true until the hard navigation unloads the page; the overlay should
  // never tear down before then.
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = () => {
    setIsLoggingOut(true)
    // Hard navigation (not the Next router) to a plain route handler that
    // clears the api-key cookie server-side: a soft RSC redirect would
    // re-render the signed-out dashboard and tear down this overlay before
    // the browser leaves the page. window.location keeps the overlay up until
    // unload.
    window.location.href = SIGN_OUT_URL
  }

  const brand = (
    <>
      <E2BLogo
        className={cn(
          'size-8 shrink-0 transition-all duration-100 ease-in-out',
          'group-data-[collapsible=icon]:size-9'
        )}
      />
      <div className="grid flex-1 text-left leading-tight">
        <span className="text-fg-tertiary truncate prose-label">E2B</span>
        <span className="text-fg truncate prose-body-highlight normal-case">
          Dashboard
        </span>
      </div>
    </>
  )

  if (!showSignOut) {
    return (
      <SidebarMenuItem className="h-14 px-3 pb-2 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-2 group-data-[collapsible=icon]:pb-3">
        <SidebarMenuButton variant="outline" size="switcher" asChild>
          <div>{brand}</div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <>
      <SidebarMenuItem className="h-14 px-3 pb-2 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-2 group-data-[collapsible=icon]:pb-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton variant="outline" size="switcher">
              {brand}
              <UnpackIcon className="text-fg-tertiary ml-auto size-4!" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            collisionPadding={10}
            className="w-[280px] p-2"
            align="start"
            sideOffset={4}
          >
            <DropdownMenuGroup className="gap-0 pt-0 pb-0">
              <DropdownMenuItem
                variant="error"
                className="h-9 gap-2.5 [&_svg]:size-5 font-sans prose-body-highlight"
                disabled={isLoggingOut}
                onSelect={handleLogout}
              >
                <LogOutIcon className="ml-0.5" /> Change API key
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      {isLoggingOut && (
        <Portal className="bg-bg/90 fixed inset-0 z-60 flex items-center justify-center gap-2.5">
          <Loader variant="slash" size="sm" />
          <span className="prose-body-highlight">Signing out...</span>
        </Portal>
      )}
    </>
  )
}
