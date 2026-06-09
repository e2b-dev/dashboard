import { describe, expect, it } from 'vitest'
import { getFaviconEnvironment, getFaviconHref } from '@/configs/favicon'

describe('environment favicon', () => {
  it('uses the original favicon appearance in production', () => {
    expect(getFaviconEnvironment('production')).toBe('production')
    expect(getFaviconHref('production')).toBe('/favicon.ico')
  })

  it('uses amber background in preview', () => {
    expect(getFaviconEnvironment('preview')).toBe('preview')
    expect(getFaviconHref('preview')).toBe('/favicon-preview.ico')
  })

  it('uses blue background in local development', () => {
    expect(getFaviconEnvironment('development')).toBe('development')
    expect(getFaviconHref('development')).toBe('/favicon-development.ico')
  })

  it('falls back to local development when VERCEL_ENV is missing', () => {
    expect(getFaviconEnvironment(undefined)).toBe('development')
    expect(getFaviconHref(undefined)).toBe('/favicon-development.ico')
  })
})
