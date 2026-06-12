export type AgentId = 'codex' | 'claude' | 'opencode'

export type AgentTemplateConfig = {
  id: AgentId
  name: string
  command: string
  templateId: string
  base: string
  description: string
}

const AGENT_TEMPLATE_IDS = {
  codex: process.env.NEXT_PUBLIC_CODEX_AGENT_TEMPLATE_ID ?? 'codex',
  claude: process.env.NEXT_PUBLIC_CLAUDE_AGENT_TEMPLATE_ID ?? 'claude',
  opencode: process.env.NEXT_PUBLIC_OPENCODE_AGENT_TEMPLATE_ID ?? 'opencode',
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
