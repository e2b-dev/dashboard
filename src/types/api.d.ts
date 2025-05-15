interface Sandbox {
  alias: string
  clientID: string
  cpuCount: number
  memoryMB: number
  metadata: Record<string, unknown>
  sandboxID: string
  startedAt: string
  endAt: string
  templateID: string
}

interface Template {
  aliases: string[]
  buildID: string
  cpuCount: number
  memoryMB: number
  public: boolean
  templateID: string
  createdAt: string
  updatedAt: string
  createdBy: {
    email: string
    id: string
  } | null
}

interface DefaultTemplate extends Template {
  isDefault: true
  defaultDescription?: string
}

interface SandboxMetrics {
  cpuCount: number
  cpuUsedPct: number
  memTotalMiB: number
  memUsedMiB: number
  timestamp: string
}

interface CreatedAccessToken {
  id: string
  name: string
  token: string
  tokenMask: string
  createdAt: string
  createdBy: {
    email: string
    id: string
  } | null
}

interface CreatedTeamAPIKey {
  id: string
  name: string
  key: string
  keyMask: string
  createdAt: string
  createdBy: {
    email: string
    id: string
  } | null
  lastUsed: string | null
}

interface TeamAPIKey {
  id: string
  name: string
  keyMask: string
  createdAt: string
  createdBy: {
    email: string
    id: string
  } | null
  lastUsed: string | null
}

export type {
  Sandbox,
  Template,
  SandboxMetrics,
  DefaultTemplate,
  CreatedAccessToken,
  CreatedTeamAPIKey,
  TeamAPIKey,
}
