import { describe, expect, it } from 'vitest'
import {
  buildOryStartURL,
  normalizeOryReturnTo,
} from '@/core/server/auth/ory/build-start-url'

describe('buildOryStartURL', () => {
  it('preserves safe relative returnTo values', () => {
    expect(buildOryStartURL('reauth', '/dashboard/account?reauth=1')).toBe(
      '/api/auth/oauth-start?intent=reauth&returnTo=%2Fdashboard%2Faccount%3Freauth%3D1'
    )
  })

  it('drops unsafe returnTo values', () => {
    expect(normalizeOryReturnTo('https://evil.test/dashboard')).toBeUndefined()
    expect(normalizeOryReturnTo('//evil.test/dashboard')).toBeUndefined()
    expect(normalizeOryReturnTo('javascript:alert(1)')).toBeUndefined()
    expect(buildOryStartURL('signin', '//evil.test/dashboard')).toBe(
      '/api/auth/oauth-start?intent=signin'
    )
  })
})
