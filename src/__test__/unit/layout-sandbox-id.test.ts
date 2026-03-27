import { describe, expect, it } from 'vitest'
import { getDashboardLayoutConfig } from '@/configs/layout' // pragma: allowlist secret

describe('Sandbox Layout Config', () => {
  it('should display full sandbox ID in breadcrumb', () => {
    const fullSandboxId = 'I1E55KOJWB0SJO8K3RHIN'
    const teamSlug = 'my-team'
    const pathname = `/dashboard/${teamSlug}/sandboxes/${fullSandboxId}/monitoring` // pragma: allowlist secret

    const config = getDashboardLayoutConfig(pathname) // pragma: allowlist secret

    expect(config.title).toBeInstanceOf(Array)
    expect(config.title).toHaveLength(2)

    if (Array.isArray(config.title)) {
      expect(config.title[0]).toEqual({
        label: 'Sandboxes',
        href: `/dashboard/${teamSlug}/sandboxes?tab=list`, // pragma: allowlist secret
      })
      expect(config.title[1]).toEqual({
        label: fullSandboxId,
      })
    }

    expect(config.copyValue).toBe(fullSandboxId)
  })

  it('should not truncate long sandbox IDs', () => {
    const longSandboxId = 'VeryLongSandboxIdentifier123456'
    const teamSlug = 'test-team'
    const pathname = `/dashboard/${teamSlug}/sandboxes/${longSandboxId}/logs` // pragma: allowlist secret

    const config = getDashboardLayoutConfig(pathname) // pragma: allowlist secret

    if (Array.isArray(config.title)) {
      expect(config.title[1]?.label).toBe(longSandboxId)
      expect(config.title[1]?.label).not.toContain('...')
    }
  })

  it('should handle short sandbox IDs without truncation', () => {
    const shortId = 'abc123'
    const teamSlug = 'team'
    const pathname = `/dashboard/${teamSlug}/sandboxes/${shortId}/filesystem` // pragma: allowlist secret

    const config = getDashboardLayoutConfig(pathname) // pragma: allowlist secret

    if (Array.isArray(config.title)) {
      expect(config.title[1]?.label).toBe(shortId)
      expect(config.title[1]?.label).not.toContain('...')
    }
  })
})
