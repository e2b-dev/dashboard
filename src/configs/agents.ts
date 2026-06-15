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

const getString = (source: Record<string, unknown>, key: string) => {
  const value = source[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

const toAgentTemplateConfig = (
  value: unknown
): AgentTemplateConfig | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  const source = value as Record<string, unknown>
  const name = getString(source, 'name')
  const template =
    getString(source, 'template') ?? getString(source, 'templateId')
  const description = getString(source, 'description')

  if (!name || !template || !description) {
    return undefined
  }

  return {
    id: getString(source, 'id') ?? name.toLowerCase().replace(/\s+/g, '-'),
    teamId: getString(source, 'teamId') ?? null,
    name,
    command: getString(source, 'command'),
    template,
    description,
    author: getString(source, 'author'),
    public: typeof source.public === 'boolean' ? source.public : undefined,
    createdAt: getString(source, 'createdAt'),
    updatedAt: getString(source, 'updatedAt'),
    deletedAt: getString(source, 'deletedAt') ?? null,
  }
}

const parseAgentTemplates = (
  value: string | undefined
): AgentTemplateConfig[] | undefined => {
  if (!value) return undefined

  try {
    const parsed = JSON.parse(value) as unknown

    if (!Array.isArray(parsed)) {
      return undefined
    }

    const templates = parsed
      .map(toAgentTemplateConfig)
      .filter((template): template is AgentTemplateConfig => Boolean(template))

    return templates.length ? templates : undefined
  } catch {
    return undefined
  }
}

const getConfiguredAgentTemplates = () =>
  parseAgentTemplates(
    process.env.AGENT_TEMPLATES ?? process.env.NEXT_PUBLIC_AGENT_TEMPLATES
  )

const configuredAgentTemplates = getConfiguredAgentTemplates()

export const AGENT_TEMPLATES: AgentTemplateConfig[] =
  configuredAgentTemplates ?? DEFAULT_AGENT_TEMPLATES

export const getAgentTemplates = () =>
  getConfiguredAgentTemplates() ?? DEFAULT_AGENT_TEMPLATES

export const resolveAgentTemplates = (
  templates: AgentTemplateConfig[] | undefined
) => templates ?? getAgentTemplates()

export const AGENT_TEMPLATE_BY_ID = Object.fromEntries(
  AGENT_TEMPLATES.map((template) => [template.id, template])
) as Record<string, AgentTemplateConfig>
