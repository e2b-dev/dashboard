import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * release-please is only exercised on main, where a mistake means a release
 * that never tags or a tag the publish workflow ignores. These assertions keep
 * the three files that have to agree from drifting apart.
 */
const read = (relativePath: string) =>
  JSON.parse(readFileSync(join(process.cwd(), relativePath), 'utf8'))

describe('release-please configuration', () => {
  it('releases the repository root as a node package, tags are v<version> with no component prefix', () => {
    const config = read('release-please-config.json')
    const root = config.packages['.']

    expect(root['release-type']).toBe('node')
    expect(root['include-v-in-tag']).toBe(true)
    expect(root['include-component-in-tag']).toBe(false)
    expect(config['bump-minor-pre-major']).toBe(true)
  })

  it('tracks one SemVer version that package.json agrees with', () => {
    const manifest = read('.release-please-manifest.json')
    const pkg = read('package.json')

    // release-please moves this on every release, so the test checks the
    // shape and that the two files agree, never a specific number.
    expect(manifest['.']).toMatch(/^\d+\.\d+\.\d+$/)
    expect(pkg.version).toBe(manifest['.'])
  })
})
