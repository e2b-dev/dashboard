import { describe, expect, it } from 'vitest'
import { getStatusPageStateFromWidget } from '@/features/dashboard/layouts/status-indicator'

describe('status-indicator', () => {
  it('should report operational when widget has no active events', () => {
    expect(
      getStatusPageStateFromWidget({
        ongoing_incidents: [],
        in_progress_maintenances: [],
        scheduled_maintenances: [
          {
            affected_components: [{ status: 'under_maintenance' }],
          },
        ],
      })
    ).toBe('operational')
  })

  it('should report maintenance for in-progress maintenances', () => {
    expect(
      getStatusPageStateFromWidget({
        ongoing_incidents: [],
        in_progress_maintenances: [{}],
      })
    ).toBe('maintenance')
  })

  it('should report downtime for full outage incidents', () => {
    expect(
      getStatusPageStateFromWidget({
        ongoing_incidents: [
          {
            affected_components: [
              { status: 'degraded_performance' },
              { status: 'full_outage' },
            ],
          },
        ],
      })
    ).toBe('downtime')
  })

  it('should report degraded for partial outage incidents', () => {
    expect(
      getStatusPageStateFromWidget({
        ongoing_incidents: [
          {
            affected_components: [{ status: 'partial_outage' }],
          },
        ],
      })
    ).toBe('degraded')
  })

  it('should report degraded when incident has no component status', () => {
    expect(
      getStatusPageStateFromWidget({
        ongoing_incidents: [{}],
      })
    ).toBe('degraded')
  })
})
