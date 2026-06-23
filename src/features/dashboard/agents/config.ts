export type AgentTemplateConfig = {
  id: string
  name: string
  command: string
  template: string
  templateName: string
  icon: 'claude' | 'open' | 'openai'
  description: string
}
