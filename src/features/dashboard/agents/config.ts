export type AgentTemplateConfig = {
  id: string
  name: string
  command: string
  template: string
  icon: 'claude' | 'open' | 'openai'
  description: string
}
