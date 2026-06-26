import { LOG_RETENTION_MS } from '@/configs/logs'
import DashboardEmptyFrame from '@/features/dashboard/common/empty-frame'

const RETENTION_DAYS = LOG_RETENTION_MS / 24 / 60 / 60 / 1000

export function DataRetentionExpired() {
  return (
    <DashboardEmptyFrame
      // min-w-0 lets the frame shrink inside flex tab containers; without it the
      // wide ASCII background forces min-content width and pushes the card off-screen.
      className="min-w-0"
      title="Data retention is over"
      description={`This sandbox's monitoring, events, and logs data has exceeded the ${RETENTION_DAYS}-day retention limit and is no longer available.`}
      descriptionPlacement="content"
    />
  )
}
