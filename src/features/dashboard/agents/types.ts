import type { AgentTemplateConfig } from '@/configs/agents'

export type WindowPosition = {
  x: number
  y: number
}

export type WindowSize = {
  height: number
  width: number
}

export type AgentTerminalWindow = {
  command?: string
  id: string
  forceNewSandbox?: boolean
  minimized: boolean
  minimizedOrder?: number
  position: WindowPosition
  size: WindowSize
  sandboxId?: string
  template: AgentTemplateConfig
}
