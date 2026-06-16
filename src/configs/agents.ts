import { z } from 'zod'

export type AgentId = string

export type AgentTemplateConfig = {
  id: AgentId
  teamId?: string | null
  name: string
  command?: string
  template: string
  description: string
  author?: string
  public?: boolean
  createdAt?: string
  updatedAt?: string
  deletedAt?: string | null
}

const DEFAULT_AGENT_TEMPLATES = [
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

export const AgentTemplateConfigSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    teamId: z.string().trim().min(1).nullable().optional(),
    name: z.string().trim().min(1),
    command: z.string().trim().min(1).optional(),
    template: z.string().trim().min(1).optional(),
    templateId: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1),
    author: z.string().trim().min(1).optional(),
    public: z.boolean().optional(),
    createdAt: z.string().trim().min(1).optional(),
    updatedAt: z.string().trim().min(1).optional(),
    deletedAt: z.string().trim().min(1).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.template && !value.templateId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Expected template or templateId',
        path: ['template'],
      })
    }
  })
  .transform(
    (value): AgentTemplateConfig => ({
      id: value.id ?? value.name.toLowerCase().replace(/\s+/g, '-'),
      teamId: value.teamId,
      name: value.name,
      command: value.command,
      template: value.template ?? value.templateId ?? '',
      description: value.description,
      author: value.author,
      public: value.public,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
      deletedAt: value.deletedAt,
    })
  )

export const AgentTemplatesSchema = z
  .array(AgentTemplateConfigSchema)
  .min(1) satisfies z.ZodType<AgentTemplateConfig[]>
export const AgentTemplatesFeatureFlagSchema = z.array(
  AgentTemplateConfigSchema
) satisfies z.ZodType<AgentTemplateConfig[]>

export const AGENT_TEMPLATES: AgentTemplateConfig[] = DEFAULT_AGENT_TEMPLATES

export const getAgentTemplates = () => DEFAULT_AGENT_TEMPLATES

export const resolveAgentTemplates = (
  templates: AgentTemplateConfig[] | undefined
) => templates ?? getAgentTemplates()

export const AGENT_TEMPLATE_BY_ID = Object.fromEntries(
  AGENT_TEMPLATES.map((template) => [template.id, template])
) as Record<string, AgentTemplateConfig>
