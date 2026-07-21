// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  PROJECTS_ANNOUNCEMENT_URL,
  ProjectsAnnouncementBanner,
} from '@/features/dashboard/projects-announcement/banner'

// This jsdom environment does not provide window.localStorage; back it with
// an in-memory store so the persistence contract stays observable.
if (!window.localStorage) {
  const store = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, String(value))
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
      clear: () => {
        store.clear()
      },
    },
  })
}

describe('ProjectsAnnouncementBanner', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the announcement linking to the projects docs for a fresh session', () => {
    render(<ProjectsAnnouncementBanner />)

    const link = screen.getByRole('link', {
      name: /teams are being renamed to projects/i,
    })
    expect(link).toHaveProperty('href', PROJECTS_ANNOUNCEMENT_URL)
    expect(PROJECTS_ANNOUNCEMENT_URL).toBe('https://e2b.dev/docs/projects')
    expect(
      screen.getByRole('button', { name: 'Dismiss announcement' })
    ).toBeTruthy()
  })

  it('hides on close and stays dismissed on remount', () => {
    const { unmount } = render(<ProjectsAnnouncementBanner />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Dismiss announcement' })
    )
    expect(screen.queryByRole('link')).toBeNull()

    unmount()
    render(<ProjectsAnnouncementBanner />)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('also dismisses when the article link is clicked', () => {
    const { unmount } = render(<ProjectsAnnouncementBanner />)

    fireEvent.click(
      screen.getByRole('link', {
        name: /teams are being renamed to projects/i,
      })
    )
    expect(screen.queryByRole('link')).toBeNull()

    unmount()
    render(<ProjectsAnnouncementBanner />)
    expect(screen.queryByRole('link')).toBeNull()
  })
})
