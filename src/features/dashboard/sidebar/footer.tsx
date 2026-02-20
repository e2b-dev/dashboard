'use client'

import { INCLUDE_DASHBOARD_FEEDBACK_SURVEY, INCLUDE_REPORT_ISSUE } from '@/configs/flags'
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
import { Book, Bug, Github, MessageSquarePlus } from 'lucide-react'
import Link from 'next/link'
import DashboardSurveyPopover from '../navbar/dashboard-survey-popover'
import ReportIssuePopover from '../navbar/report-issue-popover'
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

      {(INCLUDE_DASHBOARD_FEEDBACK_SURVEY || INCLUDE_REPORT_ISSUE) && (
        <SidebarMenu
          className={cn(
            'flex-row gap-0 border-t group-data-[collapsible=icon]:flex-col h-protected-statusbar',
            SIDEBAR_TRANSITION_CLASSNAMES
          )}
        >
          {INCLUDE_DASHBOARD_FEEDBACK_SURVEY && (
            <SidebarMenuItem
              key="survey"
              className={cn(
                'flex-1 transition-all group-data-[collapsible=icon]:pl-2',
                SIDEBAR_TRANSITION_CLASSNAMES
              )}
            >
              <DashboardSurveyPopover
                trigger={
                  <SidebarMenuButton
                    tooltip="Feedback"
                    variant="ghost"
                    className={cn(
                      'hover:bg-bg-hover transition-all w-full h-full justify-center group-data-[collapsible=icon]:justify-start',
                      SIDEBAR_TRANSITION_CLASSNAMES
                    )}
                  >
                    <MessageSquarePlus className="hidden group-data-[collapsible=icon]:block group-data-[collapsible=icon]:!size-5" />
                    Feedback
                  </SidebarMenuButton>
                }
              />
            </SidebarMenuItem>
          )}
          {INCLUDE_DASHBOARD_FEEDBACK_SURVEY && INCLUDE_REPORT_ISSUE && (
            /* separator */
            <div className="border-r h-full hidden group-data-[collapsible=icon]:hidden group-data-[state=expanded]:block" />
          )}
          {INCLUDE_REPORT_ISSUE && (
            <SidebarMenuItem
              key="report-issue"
              className={cn(
                'flex-1 transition-all group-data-[collapsible=icon]:pl-2',
                SIDEBAR_TRANSITION_CLASSNAMES
              )}
            >
              <ReportIssuePopover
                trigger={
                  <SidebarMenuButton
                    tooltip="Report Issue"
                    variant="ghost"
                    className={cn(
                      'hover:bg-bg-hover transition-all w-full h-full justify-center group-data-[collapsible=icon]:justify-start',
                      SIDEBAR_TRANSITION_CLASSNAMES
                    )}
                  >
                    <Bug className="hidden group-data-[collapsible=icon]:block group-data-[collapsible=icon]:!size-5" />
                    Report Issue
                  </SidebarMenuButton>
                }
              />
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      )}
    </>
  )
}
