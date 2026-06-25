'use client'

import { Kbd } from '@/ui/primitives/kbd'
import { SidebarRail, useSidebar } from '@/ui/primitives/sidebar'

export default function DashboardSidebarRail() {
  const { state } = useSidebar()

  return (
    <SidebarRail
      // Remount on toggle so the hover tooltip dismisses instead of lingering
      // and re-anchoring when the rail moves out from under a stationary cursor.
      key={state}
      tooltip={
        <>
          <span className="text-fg-secondary text-xs">Toggle Sidebar</span>
          <Kbd keys={['cmd', 'b']} clientOnlyProps={{ disable: true }} />
        </>
      }
    />
  )
}
