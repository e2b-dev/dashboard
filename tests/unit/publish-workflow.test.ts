import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The publish path cannot be exercised outside a release, so these assertions
 * guard the flags it cannot go without: the registry it pushes to, the single
 * architecture, and the attestation switches Artifact Registry rejects.
 */
const workflow = readFileSync(
  join(process.cwd(), '.github/workflows/publish.yml'),
  'utf8'
)

describe('publish workflow', () => {
  it('runs on version tags and by hand', () => {
    expect(workflow).toMatch(/tags:\s*\n\s*- 'v\*'/)
    expect(workflow).toContain('workflow_dispatch:')
    expect(workflow).toContain('dry_run:')
    // The one string that couples release-please's tag shape to what this
    // workflow agrees to publish.
    expect(workflow).toContain("'^v[0-9]+\\.[0-9]+\\.[0-9]+$'")
  })

  it('is unreachable from a pull request, which would hand a fork the publisher identity', () => {
    expect(workflow).not.toContain('pull_request_target')
    expect(workflow).not.toContain('pull_request:')
    expect(workflow).not.toContain('workflow_run')
  })

  it('pushes the published image coordinates', () => {
    expect(workflow).toContain(
      'us-docker.pkg.dev/e2b-artifacts/dashboard/dashboard'
    )
    expect(workflow).toContain('--platform linux/amd64')
  })

  it('disables the attestations Artifact Registry rejects', () => {
    expect(workflow).toContain('--provenance=false')
    expect(workflow).toContain('--sbom=false')
  })

  it('authenticates with workload identity from repository variables', () => {
    expect(workflow).toContain('vars.GCP_WORKLOAD_IDENTITY_PROVIDER')
    expect(workflow).toContain('vars.GCP_SERVICE_ACCOUNT')
    expect(workflow).not.toMatch(/credentials_json|service_account_key/)
  })
})
