import { describe, expect, it } from 'vitest'
import { getStatusPageStateFromSummary } from '@/features/dashboard/layouts/status-indicator'

describe('status-indicator', () => {
  it('should report operational for summary indicator none', () => {
    expect(
      getStatusPageStateFromSummary({
        status: {
          indicator: 'none',
        },
      })
    ).toBe('operational')
  })

  it('should report maintenance for in-progress maintenance', () => {
    expect(
      getStatusPageStateFromSummary({
        scheduled_maintenances: [
          {
            status: 'maintenance_in_progress',
          },
        ],
      })
    ).toBe('maintenance')
  })

  it('should report downtime for critical summary indicator', () => {
    expect(
      getStatusPageStateFromSummary({
        status: {
          indicator: 'critical',
        },
      })
    ).toBe('downtime')
  })

  it('should report degraded for major summary indicator', () => {
    expect(
      getStatusPageStateFromSummary({
        status: {
          indicator: 'major',
        },
      })
    ).toBe('degraded')
  })

  it('should report degraded for minor summary indicator', () => {
    expect(
      getStatusPageStateFromSummary({
        status: {
          indicator: 'minor',
        },
      })
    ).toBe('degraded')
  })
})
