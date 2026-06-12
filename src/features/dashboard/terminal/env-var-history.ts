'use client'

import {
  mergeTerminalEnvVarNames,
  normalizeTerminalEnvVarName,
} from './env-vars'

const STORAGE_KEY = 'dashboard:terminal-env-var-history:v1'

interface TerminalEnvVarHistory {
  sandboxes?: Record<string, string[]>
  templates?: Record<string, string[]>
}

export interface TerminalEnvVarHistorySnapshot {
  sandboxNames: string[]
  templateNames: string[]
}

export function readTerminalEnvVarHistory({
  sandboxId,
  template,
}: {
  sandboxId?: string
  template?: string
}): TerminalEnvVarHistorySnapshot {
  const history = readHistory()

  return {
    sandboxNames: sandboxId ? (history.sandboxes?.[sandboxId] ?? []) : [],
    templateNames: template ? (history.templates?.[template] ?? []) : [],
  }
}

export function addTerminalEnvVarHistory({
  name,
  sandboxId,
  template,
}: {
  name: string
  sandboxId?: string
  template?: string
}) {
  const normalizedName = normalizeTerminalEnvVarName(name)
  if (!normalizedName) return null

  const history = readHistory()

  if (sandboxId) {
    history.sandboxes = {
      ...history.sandboxes,
      [sandboxId]: mergeTerminalEnvVarNames(
        history.sandboxes?.[sandboxId] ?? [],
        [normalizedName]
      ),
    }
  }

  if (template) {
    history.templates = {
      ...history.templates,
      [template]: mergeTerminalEnvVarNames(
        history.templates?.[template] ?? [],
        [normalizedName]
      ),
    }
  }

  writeHistory(history)

  return normalizedName
}

export function removeTerminalEnvVarHistory({
  name,
  sandboxId,
  template,
}: {
  name: string
  sandboxId?: string
  template?: string
}) {
  const normalizedName = normalizeTerminalEnvVarName(name)
  if (!normalizedName) return

  const history = readHistory()

  if (sandboxId && history.sandboxes?.[sandboxId]) {
    history.sandboxes = {
      ...history.sandboxes,
      [sandboxId]: history.sandboxes[sandboxId].filter(
        (storedName) => storedName !== normalizedName
      ),
    }
  }

  if (template && history.templates?.[template]) {
    history.templates = {
      ...history.templates,
      [template]: history.templates[template].filter(
        (storedName) => storedName !== normalizedName
      ),
    }
  }

  writeHistory(history)
}

function readHistory(): TerminalEnvVarHistory {
  if (typeof window === 'undefined') return {}

  try {
    const storedHistory = window.localStorage.getItem(STORAGE_KEY)
    if (!storedHistory) return {}

    const parsedHistory = JSON.parse(storedHistory) as TerminalEnvVarHistory

    return {
      sandboxes: cleanHistoryRecord(parsedHistory.sandboxes),
      templates: cleanHistoryRecord(parsedHistory.templates),
    }
  } catch {
    return {}
  }
}

function writeHistory(history: TerminalEnvVarHistory) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
}

function cleanHistoryRecord(record: unknown) {
  if (!record || typeof record !== 'object') return undefined

  return Object.fromEntries(
    Object.entries(record).flatMap(([scope, keys]) => {
      if (!Array.isArray(keys)) return []

      return [[scope, mergeTerminalEnvVarNames(keys)]]
    })
  )
}
