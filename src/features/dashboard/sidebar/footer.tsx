'use client'

import { INCLUDE_DASHBOARD_FEEDBACK_SURVEY, INCLUDE_REPORT_ISSUE } from '@/configs/flags'
import { GITHUB_URL } from '@/configs/urls'
import { cn } from '@/lib/utils'
import { ExternalLinkIcon } from '@/ui/primitives/icons'
import {
  SIDEBAR_TRANSITION_CLASSNAMES,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/ui/primitives/sidebar'
import { BugIcon, DocsIcon, FeedbackIcon, GithubIcon } from '@/ui/primitives/icons'
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
                  <GithubIcon />
                  GitHub
                  <ExternalLinkIcon className="ml-auto !size-4 text-fg-tertiary" />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem key="docs">
              <SidebarMenuButton asChild tooltip="Documentation">
                <Link href="/docs" target="_blank" rel="noopener noreferrer">
                  <DocsIcon />
                  Documentation
                  <ExternalLinkIcon className="ml-auto !size-4 text-fg-tertiary" />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarFooter>

      {(INCLUDE_DASHBOARD_FEEDBACK_SURVEY || INCLUDE_REPORT_ISSUE) && (
        <SidebarMenu
          className={cn(
            'h-protected-statusbar shrink-0 flex-row gap-0 border-t group-data-[collapsible=icon]:h-auto group-data-[collapsible=icon]:flex-col',
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
                    className={cn(
                      'transition-all h-full w-full justify-center group-data-[collapsible=icon]:h-[35px]! group-data-[collapsible=icon]:justify-start',
                      SIDEBAR_TRANSITION_CLASSNAMES
                    )}
                  >
                    <FeedbackIcon className="hidden group-data-[collapsible=icon]:block" />
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
                    className={cn(
                      'transition-all h-full w-full justify-center group-data-[collapsible=icon]:h-[35px]! group-data-[collapsible=icon]:justify-start',
                      SIDEBAR_TRANSITION_CLASSNAMES
                    )}
                  >
                    <BugIcon className="hidden group-data-[collapsible=icon]:block" />
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
