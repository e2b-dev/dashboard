import { GITHUB_URL } from '@/configs/socials'
import { getApiDomain } from '@/lib/utils/server'
import ExternalIcon from '@/ui/external-icon'
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/ui/primitives/sidebar'
import { Book, Construction, Github } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import DeveloperSettingsDialog from '../developer-settings/settings-dialog'

export default function DashboardSidebarFooter() {
  return (
    <SidebarFooter>
      <SidebarMenu>
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
        <Suspense fallback={null}>
          <ClientComponentWrapper />
        </Suspense>
      </SidebarMenu>
    </SidebarFooter>
  )
}

async function ClientComponentWrapper() {
  const apiDomain = await getApiDomain()

  return (
    <SidebarMenuItem key="developer-settings">
      <DeveloperSettingsDialog apiDomain={apiDomain}>
        <SidebarMenuButton tooltip="Developer Settings">
          <Construction className="text-fg-500 size-4" />
          Developer Settings
        </SidebarMenuButton>
      </DeveloperSettingsDialog>
    </SidebarMenuItem>
  )
}
