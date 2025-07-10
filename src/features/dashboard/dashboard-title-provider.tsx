'use client'

import { METADATA } from '@/configs/metadata'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo } from 'react'

/**
 * DashboardTitleProvider updates the document title based on the current team and pathname.
 * It shows either:
 * - "{team_name} | {page_name} | E2B" when a team is selected
 * - Default metadata title when no team is selected
 */
export const DashboardTitleProvider = () => {
  // Get current team and pathname
  const team = useSelectedTeam()
  const pathname = usePathname()

  // Compute the title based on team and current page
  const title = useMemo(() => {
    // Get the last segment of the path and capitalize it
    const pageName =
      pathname!.split('/')!.pop()!.charAt(0)!.toUpperCase() +
        pathname!.split('/')!.pop()!.slice(1) || ''

    // If team exists, show team name and page, otherwise show default title
    if (!team) return METADATA.title

    const teamName =
      team.name.length > 10 ? `${team.name.slice(0, 10)}...` : team.name

    return `${teamName} | ${pageName} | E2B`
  }, [team, pathname])

  // Update document title whenever title changes
  useEffect(() => {
    document.title = title
  }, [title])

  // Empty fragment since this is just a utility component
  return <></>
}
