import { components as InfraComponents } from '@/types/infra-api'

type Sandbox = InfraComponents['schemas']['ListedSandbox']

type SandboxInfo = InfraComponents['schemas']['SandboxDetail']

type Sandboxes = InfraComponents['schemas']['ListedSandbox'][]

type SandboxMetric = InfraComponents['schemas']['SandboxMetric']

type SandboxesMetricsRecord =
  InfraComponents['schemas']['SandboxesWithMetrics']['sandboxes']

type Template = InfraComponents['schemas']['Template']

type DefaultTemplate = Template & {
  isDefault: true
  defaultDescription?: string
}

type TeamUser = InfraComponents['schemas']['TeamUser']

type IdentifierMaskingDetails =
  InfraComponents['schemas']['IdentifierMaskingDetails']

type CreatedAccessToken = InfraComponents['schemas']['CreatedAccessToken']

type CreatedTeamAPIKey = InfraComponents['schemas']['CreatedTeamAPIKey']

type TeamAPIKey = InfraComponents['schemas']['TeamAPIKey']

type SandboxInfo = InfraComponents['schemas']['SandboxDetail']

export type {
  CreatedAccessToken,
  CreatedTeamAPIKey,
  DefaultTemplate,
  IdentifierMaskingDetails,
  IdentifierMaskingDetails,
  Sandbox,
  Sandboxes,
  SandboxesMetricsRecord,
  SandboxInfo,
  SandboxMetric,
  TeamAPIKey,
  TeamUser,
  Template,
}
