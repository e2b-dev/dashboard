export type AgentTemplateConfig = {
  id: string
  name: string
  command: string
  template: string
  icon: 'claude' | 'open' | 'openai'
  description: string
}

export const AGENT_TEMPLATES = [
  {
    id: 'codex',
    name: 'Codex',
    command: 'codex',
    template: 'codex',
    icon: 'openai',
    description: 'Codex CLI for coding sessions.',
  },
  {
    id: 'claude',
    name: 'Claude',
    command: 'claude',
    template: 'claude',
    icon: 'claude',
    description: 'Claude Code for coding sessions.',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    command: 'opencode',
    template: 'opencode',
    icon: 'open',
    description: 'OpenCode for coding sessions.',
  },
] satisfies AgentTemplateConfig[]
