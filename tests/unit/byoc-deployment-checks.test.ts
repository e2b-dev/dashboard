import { describe, expect, it } from 'vitest'
import { buildDeploymentChecks } from '@/features/dashboard/byoc/deployment-checks'

const event = (
  phase: string,
  message: string,
  created_at = '2026-07-11T10:00:00Z'
) => ({
  created_at,
  message,
  phase,
})

describe('buildDeploymentChecks', () => {
  it('scopes progress to the current operation', () => {
    const checks = buildDeploymentChecks(
      [
        event('operation_started', 'Worker started operation old-operation.'),
        event('smoke_testing', 'Sandbox smoke passed with sandbox old.'),
        event('operation_started', 'Worker started operation new-operation.'),
      ],
      { id: 'new-operation', kind: 'deploy', status: 'applying' }
    )

    expect(checks[0]?.status).toBe('running')
    expect(checks.at(-1)?.status).toBe('pending')
  })

  it('uses only the latest worker attempt for a reclaimed operation', () => {
    const checks = buildDeploymentChecks(
      [
        event('operation_started', 'Worker started operation operation-1.'),
        event(
          'worker_access',
          'Worker can impersonate the GCP deployer identity.'
        ),
        event('prepare_artifacts', 'Runtime artifacts are ready.'),
        event('operation_started', 'Worker restarted operation operation-1.'),
      ],
      { id: 'operation-1', kind: 'deploy', status: 'starting' }
    )

    expect(checks[0]?.status).toBe('running')
    expect(checks[1]?.status).toBe('pending')
  })

  it('keeps checks pending until a queued operation starts', () => {
    const checks = buildDeploymentChecks([], {
      id: 'operation-1',
      kind: 'deploy',
      status: 'queued',
    })

    expect(checks.every((check) => check.status === 'pending')).toBe(true)
  })

  it('advances checks from durable phase events', () => {
    const checks = buildDeploymentChecks(
      [
        event('operation_started', 'Worker started operation operation-1.'),
        event(
          'worker_access',
          'Worker can impersonate the GCP deployer identity.'
        ),
        event('prepare_artifacts', 'Runtime artifacts are ready.'),
        event('dns_ready', 'Deployment DNS resolved.'),
        event('wait_for_nomad', 'Nomad is reachable.'),
      ],
      { id: 'operation-1', kind: 'deploy', status: 'validating' }
    )

    expect(checks.map((check) => check.status)).toEqual([
      'passed',
      'passed',
      'passed',
      'passed',
      'running',
      'pending',
      'pending',
      'pending',
      'pending',
    ])
  })

  it('marks the first incomplete check when an operation fails', () => {
    const checks = buildDeploymentChecks(
      [
        event('operation_started', 'Worker started operation operation-1.'),
        event(
          'worker_access',
          'Worker can impersonate the GCP deployer identity.'
        ),
      ],
      { id: 'operation-1', kind: 'deploy', status: 'failed_terminal' }
    )

    expect(checks[0]?.status).toBe('passed')
    expect(checks[1]?.status).toBe('failed')
    expect(checks[2]?.status).toBe('pending')
  })

  it('shows the destroy lifecycle instead of deploy checks', () => {
    const checks = buildDeploymentChecks(
      [event('operation_started', 'Worker started operation destroy-1.')],
      { id: 'destroy-1', kind: 'destroy', status: 'applying' }
    )

    expect(checks.map((check) => check.label)).toEqual([
      'Worker access verified',
      'Terraform access verified',
      'Team routing detached',
      'Infrastructure destroyed',
    ])
  })

  it('marks omitted stages as skipped after a successful operation', () => {
    const checks = buildDeploymentChecks(
      [event('operation_started', 'Worker started operation operation-1.')],
      { id: 'operation-1', kind: 'deploy', status: 'succeeded' }
    )

    expect(checks.every((check) => check.status === 'skipped')).toBe(true)
  })

  it('recognizes the complete infrastructure, application, and verification flow', () => {
    const checks = buildDeploymentChecks(
      [
        event('operation_started', 'Worker started operation operation-1.'),
        event(
          'worker_access',
          'Worker can impersonate the GCP deployer identity.'
        ),
        event('prepare_artifacts', 'Runtime artifacts are ready.'),
        event('dns_ready', 'Deployment DNS resolved.'),
        event('wait_for_nomad', 'Nomad is reachable.'),
        event('health_check', 'Terraform stages finished successfully.'),
        event('health_check', 'Edge API health check passed.'),
        event('registering_cluster', 'Team attached to cluster cluster-1.'),
        event('building_base_template', 'Base template is ready.'),
        event('smoke_testing', 'Sandbox smoke passed with sandbox sandbox-1.'),
      ],
      { id: 'operation-1', kind: 'deploy', status: 'succeeded' }
    )

    expect(checks).toHaveLength(9)
    expect(checks.every((check) => check.status === 'passed')).toBe(true)
  })
})
