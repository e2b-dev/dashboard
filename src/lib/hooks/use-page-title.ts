'use client'

import { useEffect } from 'react'
import { create } from 'zustand'
import type { TitleSegment } from '@/configs/layout'

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
      // Don't clear if a subsequent page has already replaced our override.
      const current = usePageTitleStore.getState().override
      if (current && current.title === title) {
        usePageTitleStore.getState().setOverride(null)
      }
    }
  }, [title, copyValue])
}
