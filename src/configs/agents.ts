export type AgentId = string

export type AgentTemplateConfig = {
  id: AgentId
  name: string
  command?: string
  template: string
  base?: string
  description: string
}

const DEFAULT_AGENT_TEMPLATES = [
  {
    id: 'codex',
    name: 'Codex',
    command: 'codex',
    template: 'codex',
    base: 'Ubuntu',
    description: 'Codex CLI for coding sessions.',
  },
  {
    id: 'claude',
    name: 'Claude',
    command: 'claude',
    template: 'claude',
    base: 'Ubuntu',
    description: 'Claude Code for coding sessions.',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    command: 'opencode',
    template: 'opencode',
    base: 'Ubuntu',
    description: 'OpenCode for coding sessions.',
  },
] satisfies AgentTemplateConfig[]

const getString = (source: Record<string, unknown>, key: string) => {
  const value = source[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

const toAgentTemplateConfig = (
  value: unknown
): AgentTemplateConfig | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  const source = value as Record<string, unknown>
  const name = getString(source, 'name')
  const template =
    getString(source, 'template') ?? getString(source, 'templateId')
  const description = getString(source, 'description')

  if (!name || !template || !description) {
    return undefined
  }

  return {
    id: getString(source, 'id') ?? name.toLowerCase().replace(/\s+/g, '-'),
    name,
    command: getString(source, 'command'),
    template,
    base: getString(source, 'base'),
    description,
  }
}

const parseAgentTemplates = (
  value: string | undefined
): AgentTemplateConfig[] | undefined => {
  if (!value) return undefined

  try {
    const parsed = JSON.parse(value) as unknown

    if (!Array.isArray(parsed)) {
      return undefined
    }

    const templates = parsed
      .map(toAgentTemplateConfig)
      .filter((template): template is AgentTemplateConfig => Boolean(template))

    return templates.length ? templates : undefined
  } catch {
    return undefined
  }
}

const getConfiguredAgentTemplates = () =>
  parseAgentTemplates(
    process.env.AGENT_TEMPLATES ?? process.env.NEXT_PUBLIC_AGENT_TEMPLATES
  )

const configuredAgentTemplates = getConfiguredAgentTemplates()

export const AGENT_TEMPLATES: AgentTemplateConfig[] =
  configuredAgentTemplates ?? DEFAULT_AGENT_TEMPLATES

export const getAgentTemplates = () =>
  getConfiguredAgentTemplates() ?? DEFAULT_AGENT_TEMPLATES

export const AGENT_TEMPLATE_BY_ID = Object.fromEntries(
  AGENT_TEMPLATES.map((template) => [template.id, template])
) as Record<string, AgentTemplateConfig>
