import { GITHUB_URL } from '@/configs/socials'
import ExternalIcon from '@/ui/external-icon'
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/ui/primitives/sidebar'
import { Book, Github } from 'lucide-react'
import Link from 'next/link'
import TeamBlockageAlert from './blocked-banner'

export default function DashboardSidebarFooter() {
  return (
    <SidebarFooter>
      <SidebarMenu>
        <TeamBlockageAlert className="mb-2" />
        <SidebarMenuItem key="github">
          <SidebarMenuButton asChild tooltip="GitHub">
            <Link href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              <Github className="text-fg-500 size-4" />
              GitHub
              <ExternalIcon className="ml-auto size-4" />
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem key="docs">
          <SidebarMenuButton asChild tooltip="Documentation">
            <Link href="/docs" target="_blank" rel="noopener noreferrer">
              <Book className="text-fg-500 size-4" />
              Documentation
              <ExternalIcon className="ml-auto size-4" />
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  )
}
