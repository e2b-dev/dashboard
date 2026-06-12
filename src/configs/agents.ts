export type AgentId = 'codex' | 'claude' | 'opencode'

export type AgentTemplateConfig = {
  id: AgentId
  name: string
  command: string
  templateId: string
  base: string
  description: string
}

const DEFAULT_AGENT_TEMPLATE_IDS = {
  codex: 'codex',
  claude: 'claude',
  opencode: 'opencode',
} satisfies Record<AgentId, string>

const AGENT_IDS = Object.keys(DEFAULT_AGENT_TEMPLATE_IDS) as AgentId[]

const parseAgentTemplateIds = (
  value: string | undefined
): Partial<Record<AgentId, string>> => {
  if (!value) return {}

  try {
    const parsed = JSON.parse(value) as unknown

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }

    return AGENT_IDS.reduce<Partial<Record<AgentId, string>>>((acc, id) => {
      const templateId = (parsed as Record<string, unknown>)[id]

      if (typeof templateId === 'string' && templateId.trim()) {
        acc[id] = templateId
      }

      return acc
    }, {})
  } catch {
    return {}
  }
}

const AGENT_TEMPLATE_IDS = {
  ...DEFAULT_AGENT_TEMPLATE_IDS,
  ...parseAgentTemplateIds(process.env.NEXT_PUBLIC_AGENT_TEMPLATE_IDS),
} satisfies Record<AgentId, string>

export const AGENT_TEMPLATES: AgentTemplateConfig[] = [
  {
    id: 'codex',
    name: 'Codex',
    command: 'codex',
    templateId: AGENT_TEMPLATE_IDS.codex,
    base: 'Ubuntu',
    description: 'Ubuntu template with Codex installed for coding sessions.',
  },
  {
    id: 'claude',
    name: 'Claude',
    command: 'claude',
    templateId: AGENT_TEMPLATE_IDS.claude,
    base: 'Ubuntu',
    description:
      'Ubuntu template with Claude Code installed for coding sessions.',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    command: 'opencode',
    templateId: AGENT_TEMPLATE_IDS.opencode,
    base: 'Ubuntu',
    description: 'Ubuntu template with OpenCode installed for coding sessions.',
  },
]

export const AGENT_TEMPLATE_BY_ID = Object.fromEntries(
  AGENT_TEMPLATES.map((template) => [template.id, template])
) as Record<AgentId, AgentTemplateConfig>
