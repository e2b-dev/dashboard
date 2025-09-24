'use client'

import { GITHUB_URL } from '@/configs/urls'
import { cn } from '@/lib/utils'
import ExternalIcon from '@/ui/external-icon'
import {
  SIDEBAR_TRANSITION_CLASSNAMES,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/ui/primitives/sidebar'
import { Book, Github, MessageSquarePlus } from 'lucide-react'
import Link from 'next/link'
import DashboardSurveyPopover from '../navbar/dashboard-survey-popover'
import TeamBlockageAlert from './blocked-banner'

export default function DashboardSidebarFooter() {
  return (
    <>
      <SidebarFooter>
        <SidebarGroup className="!p-0">
          <SidebarMenu>
            <TeamBlockageAlert className="mb-2" />
            <SidebarMenuItem key="github">
              <SidebarMenuButton asChild tooltip="GitHub">
                <Link
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github
                    className={cn(
                      'size-4 group-data-[collapsible=icon]:!size-5',
                      SIDEBAR_TRANSITION_CLASSNAMES
                    )}
                  />
                  GitHub
                  <ExternalIcon className="ml-auto size-4" />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem key="docs">
              <SidebarMenuButton asChild tooltip="Documentation">
                <Link href="/docs" target="_blank" rel="noopener noreferrer">
                  <Book
                    className={cn(
                      'size-4 group-data-[collapsible=icon]:!size-5',
                      SIDEBAR_TRANSITION_CLASSNAMES
                    )}
                  />
                  Documentation
                  <ExternalIcon className="ml-auto size-4" />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarFooter>

      <SidebarMenu className="p-0 gap-0">
        <SidebarMenuItem
          key="survey"
          className={cn(
            'transition-all border-t group-data-[collapsible=icon]:pl-2',
            SIDEBAR_TRANSITION_CLASSNAMES
          )}
        >
          <DashboardSurveyPopover
            trigger={
              <SidebarMenuButton
                tooltip="Survey"
                variant="ghost"
                className={cn(
                  'hover:bg-bg-hover transition-all w-full min-h-status-bar justify-center group-data-[collapsible=icon]:justify-start',
                  SIDEBAR_TRANSITION_CLASSNAMES
                )}
              >
                <MessageSquarePlus className="group-data-[collapsible=icon]:!size-5" />
                Feedback
              </SidebarMenuButton>
            }
          />
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  )
}
