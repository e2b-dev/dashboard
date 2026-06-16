import { z } from 'zod'
import { devAgentTemplates } from './agents/dev'
import { prodAgentTemplates } from './agents/prod'
import { stagingAgentTemplates } from './agents/staging'

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

type AgentTemplateEnvironment = 'dev' | 'staging' | 'prod'

const AGENT_TEMPLATES_BY_ENVIRONMENT = {
  dev: devAgentTemplates,
  staging: stagingAgentTemplates,
  prod: prodAgentTemplates,
} satisfies Record<AgentTemplateEnvironment, AgentTemplateConfig[]>

const resolveAgentTemplateEnvironment = (): AgentTemplateEnvironment => {
  switch (process.env.DASHBOARD_ENV) {
    case 'dev':
    case 'staging':
    case 'prod':
      return process.env.DASHBOARD_ENV
    default:
      break
  }

  if (process.env.VERCEL_ENV === 'production') return 'prod'
  if (process.env.VERCEL_ENV === 'preview') return 'staging'

  return 'dev'
}

export const getAgentTemplates = () =>
  AGENT_TEMPLATES_BY_ENVIRONMENT[resolveAgentTemplateEnvironment()]
