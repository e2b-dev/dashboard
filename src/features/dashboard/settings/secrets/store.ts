'use client'

import { nanoid } from 'nanoid'
import { create } from 'zustand'
import type { Secret } from './types'

// In-memory mock until the secrets backend ships. Keyed by team slug so
// switching teams doesn't bleed entries across — mirrors how the keys
// feature scopes by `team.slug`.

interface SecretsStoreState {
  byTeam: Record<string, Secret[]>
}

interface SecretsStoreActions {
  addSecret: (
    teamSlug: string,
    input: Omit<Secret, 'id' | 'createdAt'>
  ) => Secret
  updateSecret: (
    teamSlug: string,
    id: string,
    patch: Pick<Secret, 'label' | 'description' | 'allowList'>
  ) => void
  removeSecret: (teamSlug: string, id: string) => void
}

type Store = SecretsStoreState & SecretsStoreActions

// Stable reference for empty-team lookups. Returning a fresh `[]` from the
// selector would trip Zustand's Object.is check on every render and loop.
const EMPTY_SECRETS: Secret[] = []

export const useSecretsStore = create<Store>()((set) => ({
  byTeam: {},
  addSecret: (teamSlug, input) => {
    const created: Secret = {
      ...input,
      id: `sec_${nanoid(16)}`,
      createdAt: new Date().toISOString(),
    }
    set((state) => ({
      byTeam: {
        ...state.byTeam,
        [teamSlug]: [created, ...(state.byTeam[teamSlug] ?? [])],
      },
    }))
    return created
  },
  updateSecret: (teamSlug, id, patch) => {
    set((state) => ({
      byTeam: {
        ...state.byTeam,
        [teamSlug]: (state.byTeam[teamSlug] ?? []).map((s) =>
          s.id === id ? { ...s, ...patch } : s
        ),
      },
    }))
  },
  removeSecret: (teamSlug, id) => {
    set((state) => ({
      byTeam: {
        ...state.byTeam,
        [teamSlug]: (state.byTeam[teamSlug] ?? []).filter((s) => s.id !== id),
      },
    }))
  },
}))

export const useTeamSecrets = (teamSlug: string): Secret[] =>
  useSecretsStore((s) => s.byTeam[teamSlug] ?? EMPTY_SECRETS)
