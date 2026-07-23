'use client'

import Link from 'next/link'
import { GITHUB_URL } from '@/configs/urls'
import { DocsIcon, ExternalLinkIcon, GithubIcon } from '@/ui/primitives/icons'
import {
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/ui/primitives/sidebar'

export default function DashboardSidebarFooter() {
  return (
    <SidebarFooter>
      <SidebarGroup className="!p-0">
        <SidebarMenu>
          <SidebarMenuItem key="github">
            <SidebarMenuButton asChild tooltip="GitHub">
              <Link href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                <GithubIcon />
                GitHub
                <ExternalLinkIcon className="ml-auto !size-4 text-fg-tertiary" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem key="docs">
            <SidebarMenuButton asChild tooltip="Documentation">
              <Link
                href="https://e2b.dev/docs"
                target="_blank"
                rel="noopener noreferrer"
                prefetch={false}
              >
                <DocsIcon />
                Documentation
                <ExternalLinkIcon className="ml-auto !size-4 text-fg-tertiary" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarFooter>
  )
}
