'use client'

import { useEffect } from 'react'
import { create } from 'zustand'
import type { TitleSegment } from '@/configs/layout'

/**
 * Reusable mechanism that lets a client page override the dashboard
 * title bar with data fetched at runtime (e.g. friendly resource names
 * derived from a UUID in the URL).
 *
 * The global `DashboardLayoutHeader` reads from this store; when no
 * override is set, it falls back to the pathname-derived
 * `getDashboardLayoutConfig` mapping.
 *
 * Pages call `usePageTitle(segments, copyValue?)` once they have data;
 * the hook handles cleanup automatically on unmount, so navigating
 * back to a page without an override restores the pathname-derived title.
 */

export interface PageTitleOverride {
  title: string | TitleSegment[]
  copyValue?: string
}

interface PageTitleStore {
  override: PageTitleOverride | null
  setOverride: (override: PageTitleOverride | null) => void
}

export const usePageTitleStore = create<PageTitleStore>((set) => ({
  override: null,
  setOverride: (override) => set({ override }),
}))

/**
 * Set the dashboard title bar contents for as long as the calling
 * component is mounted. Passing `null` (or omitting `title`) clears
 * any previously set override on mount.
 *
 * Safe to call before data is loaded \u2014 pass `null` while loading and
 * the pathname-derived fallback title will render.
 */
export function usePageTitle(
  title: string | TitleSegment[] | null,
  copyValue?: string
) {
  useEffect(() => {
    if (title === null) {
      usePageTitleStore.getState().setOverride(null)
      return
    }

    usePageTitleStore.getState().setOverride({ title, copyValue })

    return () => {
      // Only clear if this hook is still the active owner of the
      // override. A subsequent page may have already set its own.
      const current = usePageTitleStore.getState().override
      if (current && current.title === title) {
        usePageTitleStore.getState().setOverride(null)
      }
    }
  }, [title, copyValue])
}
