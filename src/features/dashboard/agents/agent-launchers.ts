export type AgentLauncher = {
  name: string
  description: string
  template: string
  command: string
  badge: string
}

export const AGENT_LAUNCHERS: AgentLauncher[] = [
  {
    name: 'Amp',
    description: 'Multi-model terminal coding agent with code intelligence.',
    template: 'amp',
    command: 'amp',
    badge: 'Template',
  },
  {
    name: 'Claude Code',
    description: 'Anthropic coding agent with terminal and git access.',
    template: 'claude',
    command: 'claude',
    badge: 'Template',
  },
  {
    name: 'Codex',
    description: 'OpenAI coding agent running from a terminal sandbox.',
    template: 'codex',
    command: 'codex',
    badge: 'Template',
  },
  {
    name: 'Devin',
    description: 'Installs Devin for Terminal in a persistent sandbox.',
    template: 'base',
    command:
      'curl -fsSL https://cli.devin.ai/install.sh | bash && source /home/user/.bashrc',
    badge: 'Installer',
  },
  {
    name: 'OpenCode',
    description: 'Open-source coding agent with multiple model providers.',
    template: 'opencode',
    command: 'opencode',
    badge: 'Template',
  },
]
