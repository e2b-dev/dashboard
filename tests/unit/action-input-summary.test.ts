import { describe, expect, it } from 'vitest'
import { sanitizeClientInput } from '@/core/server/actions/utils'

describe('sanitizeClientInput', () => {
  it('inlines allowlisted scalar keys verbatim', () => {
    const out = sanitizeClientInput({
      teamSlug: 'acme',
      teamId: 't_123',
      templateId: 'tmpl_456',
      sandboxId: 'sbx_789',
      userId: 'user_abc',
      webhookId: 'wh_xyz',
      organizationId: 'org_1',
      page: 2,
      pageSize: 50,
      limit: 100,
      offset: 0,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      mode: 'add',
      kind: 'standard',
      type: 'webhook',
    })

    expect(out).toEqual({
      teamSlug: 'acme',
      teamId: 't_123',
      templateId: 'tmpl_456',
      sandboxId: 'sbx_789',
      userId: 'user_abc',
      webhookId: 'wh_xyz',
      organizationId: 'org_1',
      page: 2,
      pageSize: 50,
      limit: 100,
      offset: 0,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      mode: 'add',
      kind: 'standard',
      type: 'webhook',
    })
  })

  it('summarizes non-allowlisted keys as a type hint, never the raw value', () => {
    const out = sanitizeClientInput({
      signatureSecret: 'a'.repeat(64),
      password: 'hunter2',
      apiToken: 'tok_secret',
      privateKey: '-----BEGIN PRIVATE KEY-----\n…',
    })

    expect(out).toEqual({
      _signatureSecret: 'string(64)',
      _password: 'string(7)',
      _apiToken: 'string(10)',
      _privateKey: `string(${'-----BEGIN PRIVATE KEY-----\n…'.length})`,
    })

    // Belt and braces: no value should appear in the JSON-serialized output.
    const serialized = JSON.stringify(out)
    expect(serialized).not.toContain('hunter2')
    expect(serialized).not.toContain('tok_secret')
    expect(serialized).not.toContain('BEGIN PRIVATE KEY')
    expect(serialized).not.toContain('a'.repeat(64))
  })

  it('mixes allowlisted and sensitive fields safely', () => {
    const out = sanitizeClientInput({
      teamSlug: 'acme',
      webhookId: 'wh_123',
      signatureSecret: 'super-secret-value',
    })

    expect(out).toEqual({
      teamSlug: 'acme',
      webhookId: 'wh_123',
      _signatureSecret: 'string(18)',
    })
  })

  it('summarizes nested objects as "object" without recursing into values', () => {
    const out = sanitizeClientInput({
      teamSlug: 'acme',
      payload: {
        nested: {
          secret: 'should-never-appear',
        },
      },
    })

    expect(out).toEqual({
      teamSlug: 'acme',
      _payload: 'object',
    })
    expect(JSON.stringify(out)).not.toContain('should-never-appear')
  })

  it('describes arrays with length', () => {
    const out = sanitizeClientInput({
      sandboxIds: ['a', 'b', 'c', 'd'],
    })

    expect(out).toEqual({ _sandboxIds: 'array(4)' })
  })

  it('handles null, undefined, and primitive inputs', () => {
    expect(sanitizeClientInput(null)).toEqual({ _shape: 'null' })
    expect(sanitizeClientInput(undefined)).toEqual({ _shape: 'undefined' })
    expect(sanitizeClientInput('raw-string')).toEqual({
      _shape: 'string(10)',
    })
    expect(sanitizeClientInput(42)).toEqual({ _shape: 'number' })
    expect(sanitizeClientInput(true)).toEqual({ _shape: 'boolean' })
  })

  it('treats top-level array input as a non-object shape', () => {
    expect(sanitizeClientInput(['a', 'b'])).toEqual({ _shape: 'array(2)' })
  })

  it('describes null and undefined values inside an object', () => {
    const out = sanitizeClientInput({
      teamSlug: 'acme',
      maybeNull: null,
      maybeUndefined: undefined,
    })

    expect(out).toEqual({
      teamSlug: 'acme',
      _maybeNull: 'null',
      _maybeUndefined: 'undefined',
    })
  })

  it('does not inline allowlisted keys when their value is a non-scalar', () => {
    // teamSlug is allowlisted, but only when scalar — guard against payload
    // shapes that smuggle objects through allowlisted keys.
    const out = sanitizeClientInput({
      teamSlug: { evil: 'object' },
    })

    expect(out).toEqual({ _teamSlug: 'object' })
  })
})
