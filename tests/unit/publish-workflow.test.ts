import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The publish path cannot be exercised outside a release, so these assertions
 * guard the flags it cannot go without: the registry it pushes to, the single
 * architecture, and the attestation switches Artifact Registry rejects.
 */
const read = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), 'utf8')

const workflow = read('.github/workflows/publish.yml')
const releasePlease = read('.github/workflows/release-please.yml')

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

  it('fails closed when the registry cannot be read', () => {
    expect(workflow).toContain("grep -q 'NOT_FOUND'")
    expect(workflow).toContain('FIX: the publish identity cannot list')
  })

  it('checks a dispatched tag names the commit being built', () => {
    expect(workflow).toContain('git fetch --no-tags --depth=1 origin')
    expect(workflow).toContain('FETCH_HEAD^{commit}')
    // A dry run publishes nothing and may rehearse with any tag. Every run
    // that does publish has to pass the check, so the skip stops there.
    expect(workflow).toContain(
      "if: ${{ github.event_name == 'workflow_dispatch' && inputs.dry_run != true }}"
    )
  })
})

/**
 * These two hold credentials the rest of CI does not — the publish identity
 * and an App token — so a moved tag on a third-party action would run
 * someone else's code against them.
 */
describe('release automation workflows', () => {
  const files = {
    'publish.yml': workflow,
    'release-please.yml': releasePlease,
  }

  for (const [name, text] of Object.entries(files)) {
    it(`pins every action in ${name} to a commit sha`, () => {
      const uses = Array.from(
        text.matchAll(/^\s*(?:- )?uses:\s*(\S+.*)$/gm)
      ).map((match) => match[1].trim())

      expect(uses.length).toBeGreaterThan(0)
      for (const line of uses) {
        expect(line).toMatch(/^[\w.-]+\/[\w.-]+@[0-9a-f]{40} # v\d/)
      }
    })
  }
})
