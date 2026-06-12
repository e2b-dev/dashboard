import { describe, expect, it } from 'vitest'
import { getFaviconEnvironment, getFaviconIcons } from '@/configs/favicon'

describe('environment favicon', () => {
  it('uses light/dark scheme variants in production', () => {
    expect(getFaviconEnvironment('production')).toBe('production')
    expect(getFaviconIcons('production')).toEqual([
      {
        url: '/favicon.ico',
        type: 'image/x-icon',
        sizes: '32x32',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/favicon-dark.ico',
        type: 'image/x-icon',
        sizes: '32x32',
        media: '(prefers-color-scheme: dark)',
      },
    ])
  })

  it('uses amber background in preview', () => {
    expect(getFaviconEnvironment('preview')).toBe('preview')
    expect(getFaviconIcons('preview')).toEqual([
      { url: '/favicon-preview.ico', type: 'image/x-icon', sizes: '32x32' },
    ])
  })

  it('uses blue background in local development', () => {
    expect(getFaviconEnvironment('development')).toBe('development')
    expect(getFaviconIcons('development')).toEqual([
      { url: '/favicon-development.ico', type: 'image/x-icon', sizes: '32x32' },
    ])
  })

  it('falls back to local development when VERCEL_ENV is missing', () => {
    expect(getFaviconEnvironment(undefined)).toBe('development')
    expect(getFaviconIcons(undefined)).toEqual(getFaviconIcons('development'))
  })
})
