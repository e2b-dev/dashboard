import type { AgentTemplateConfig } from '@/configs/agents'

export const stagingAgentTemplates = [
  {
    id: 'codex',
    name: 'Codex',
    command: 'codex',
    template: 'codex',
    description: 'Codex CLI for coding sessions.',
  },
  {
    id: 'claude',
    name: 'Claude',
    command: 'claude',
    template: 'claude',
    description: 'Claude Code for coding sessions.',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    command: 'opencode',
    template: 'opencode',
    description: 'OpenCode for coding sessions.',
  },
] satisfies AgentTemplateConfig[]
