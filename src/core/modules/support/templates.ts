export const SUPPORT_TEMPLATES = [
  {
    id: 'sandbox_issue',
    label: 'Issue with a sandbox',
    title: 'Sandbox issue',
    prefill: `Sandbox ID:
What you were trying to do:
What went wrong (error message, logs, or unexpected behavior):
Approximate time it happened (UTC if possible):
Steps to reproduce, if known: `,
    docsUrl: '/docs/sandbox',
    docsLabel: 'Sandbox docs',
  },
  {
    id: 'snapshot_pause_resume',
    label: 'Snapshot, pause, or resume failed',
    title: 'Snapshot / pause / resume issue',
    prefill: `Sandbox ID:
Snapshot or template ID (if applicable):
Which action failed (snapshot creation, pause, resume):
Error message returned:
Approximate time it happened (UTC if possible): `,
    docsUrl: '/docs/sandbox/persistence',
    docsLabel: 'Pause & resume docs',
  },
  {
    id: 'slow_performance',
    label: 'Performance is slow',
    title: 'Performance issue',
    prefill: `Sandbox ID(s):
What is slow (sandbox start, command execution, network, file system, etc.):
How long it currently takes:
How long you expect it to take:
Approximate time of a recent slow run (UTC if possible): `,
  },
  {
    id: 'something_else',
    label: 'Something else',
    title: 'Support Request',
    prefill: '',
  },
] as const

type RawSupportTemplate = (typeof SUPPORT_TEMPLATES)[number]

export type SupportTemplateId = RawSupportTemplate['id']

export interface SupportTemplate {
  id: SupportTemplateId
  label: string
  title: string
  prefill: string
  docsUrl?: string
  docsLabel?: string
}

export const SUPPORT_TEMPLATE_IDS = SUPPORT_TEMPLATES.map((t) => t.id) as [
  SupportTemplateId,
  ...SupportTemplateId[],
]

export const DEFAULT_SUPPORT_TEMPLATE_ID: SupportTemplateId = 'something_else'

export function getSupportTemplate(id: SupportTemplateId): SupportTemplate {
  const template = SUPPORT_TEMPLATES.find((t) => t.id === id)
  if (!template) {
    throw new Error(`Unknown support template id: ${id}`)
  }
  return template
}
