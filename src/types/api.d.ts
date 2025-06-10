import {
  paths as InfraPaths,
  components as InfraComponents,
} from '@/types/infra-api'

type Sandbox = InfraComponents['schemas']['ListedSandbox']

type Template = InfraComponents['schemas']['Template']

type DefaultTemplate = Template & {
  isDefault: true
  defaultDescription?: string
}

type SandboxMetrics = InfraComponents['schemas']['SandboxMetric']

type TeamUser = InfraComponents['schemas']['TeamUser']

type IdentifierMaskingDetails =
  InfraComponents['schemas']['IdentifierMaskingDetails']

type CreatedAccessToken = InfraComponents['schemas']['CreatedAccessToken']

type CreatedTeamAPIKey = InfraComponents['schemas']['CreatedTeamAPIKey']

type TeamAPIKey = InfraComponents['schemas']['TeamAPIKey']

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
