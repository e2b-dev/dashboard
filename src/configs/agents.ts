export type AgentId = 'codex' | 'claude' | 'opencode'

export type AgentTemplateConfig = {
  id: AgentId
  name: string
  command: string
  template: string
  base: string
  description: string
}

const DEFAULT_AGENT_TEMPLATES = {
  codex: 'codex',
  claude: 'claude',
  opencode: 'opencode',
} satisfies Record<AgentId, string>

const AGENT_IDS = Object.keys(DEFAULT_AGENT_TEMPLATES) as AgentId[]

const parseAgentTemplates = (
  value: string | undefined
): Partial<Record<AgentId, string>> => {
  if (!value) return {}

  try {
    const parsed = JSON.parse(value) as unknown

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }

    return AGENT_IDS.reduce<Partial<Record<AgentId, string>>>((acc, id) => {
      const template = (parsed as Record<string, unknown>)[id]

      if (typeof template === 'string' && template.trim()) {
        acc[id] = template
      }

      return acc
    }, {})
  } catch {
    return {}
  }
}

const AGENT_TEMPLATES_BY_AGENT = {
  ...DEFAULT_AGENT_TEMPLATES,
  ...parseAgentTemplates(process.env.NEXT_PUBLIC_AGENT_TEMPLATES),
} satisfies Record<AgentId, string>

export const AGENT_TEMPLATES: AgentTemplateConfig[] = [
  {
    id: 'codex',
    name: 'Codex',
    command: 'codex',
    template: AGENT_TEMPLATES_BY_AGENT.codex,
    base: 'Ubuntu',
    description: 'Ubuntu template with Codex installed for coding sessions.',
  },
  {
    id: 'claude',
    name: 'Claude',
    command: 'claude',
    template: AGENT_TEMPLATES_BY_AGENT.claude,
    base: 'Ubuntu',
    description:
      'Ubuntu template with Claude Code installed for coding sessions.',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    command: 'opencode',
    template: AGENT_TEMPLATES_BY_AGENT.opencode,
    base: 'Ubuntu',
    description: 'Ubuntu template with OpenCode installed for coding sessions.',
  },
]

export const AGENT_TEMPLATE_BY_ID = Object.fromEntries(
  AGENT_TEMPLATES.map((template) => [template.id, template])
) as Record<AgentId, AgentTemplateConfig>
