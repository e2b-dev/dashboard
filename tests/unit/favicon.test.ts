import { describe, expect, it } from 'vitest'
import { getFaviconEnvironment, getFaviconIcons } from '@/configs/favicon'

describe('environment favicon', () => {
  it('uses the original favicon appearance in production', () => {
    expect(getFaviconEnvironment('production')).toBe('production')
    expect(getFaviconIcons('production')).toEqual([
      { url: '/favicon.ico', type: 'image/x-icon', sizes: '32x32' },
      { url: '/favicon.svg', type: 'image/svg+xml', sizes: 'any' },
    ])
  })

  it('uses amber background in preview', () => {
    expect(getFaviconEnvironment('preview')).toBe('preview')
    expect(getFaviconIcons('preview')).toEqual([
      { url: '/favicon-preview.ico', type: 'image/x-icon', sizes: '32x32' },
      { url: '/favicon-preview.svg', type: 'image/svg+xml', sizes: 'any' },
    ])
  })

  it('uses blue background in local development', () => {
    expect(getFaviconEnvironment('development')).toBe('development')
    expect(getFaviconIcons('development')).toEqual([
      { url: '/favicon-development.ico', type: 'image/x-icon', sizes: '32x32' },
      { url: '/favicon-development.svg', type: 'image/svg+xml', sizes: 'any' },
    ])
  })

  it('falls back to local development when VERCEL_ENV is missing', () => {
    expect(getFaviconEnvironment(undefined)).toBe('development')
    expect(getFaviconIcons(undefined)).toEqual(getFaviconIcons('development'))
  })
})
