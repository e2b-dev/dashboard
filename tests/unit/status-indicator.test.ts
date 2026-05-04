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
            status: 'in_progress',
          },
        ],
      })
    ).toBe('maintenance')
  })

  it('should support incident.io maintenance status naming', () => {
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

  it('should prioritize critical indicator over maintenance', () => {
    expect(
      getStatusPageStateFromSummary({
        status: {
          indicator: 'critical',
        },
        scheduled_maintenances: [
          {
            status: 'in_progress',
          },
        ],
      })
    ).toBe('downtime')
  })

  it('should report downtime for major outage components', () => {
    expect(
      getStatusPageStateFromSummary({
        status: {
          indicator: 'none',
        },
        components: [
          {
            status: 'degraded_performance',
          },
          {
            status: 'major_outage',
          },
        ],
      })
    ).toBe('downtime')
  })

  it('should report degraded for partial outage components', () => {
    expect(
      getStatusPageStateFromSummary({
        status: {
          indicator: 'none',
        },
        components: [
          {
            status: 'partial_outage',
          },
        ],
      })
    ).toBe('degraded')
  })

  it('should prioritize degraded components over maintenance indicator', () => {
    expect(
      getStatusPageStateFromSummary({
        status: {
          indicator: 'maintenance',
        },
        components: [
          {
            status: 'degraded_performance',
          },
        ],
      })
    ).toBe('degraded')
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
