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

interface TeamUser {
  id: string
  email: string
}

interface IdentifierMaskingDetails {
  prefix: string
  valueLength: number
  maskedValuePrefix: string
  maskedValueSuffix: string
}

interface CreatedAccessToken {
  id: string
  name: string
  token: string
  mask: IdentifierMaskingDetails
  createdAt: string
  createdBy: TeamUser | null
}

interface CreatedTeamAPIKey {
  id: string
  name: string
  key: string
  mask: IdentifierMaskingDetails
  createdAt: string
  createdBy: TeamUser | null
  lastUsed: string | null
}

interface TeamAPIKey {
  id: string
  name: string
  mask: IdentifierMaskingDetails
  createdAt: string
  createdBy: TeamUser | null
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
  TeamUser,
  IdentifierMaskingDetails,
}
