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
    id: 'cancel_subscription',
    label: 'Cancel my subscription',
    title: 'Subscription cancellation',
    prefill: `Team ID:
Email on the payment method:
Reason for canceling (optional, helps us improve): `,
  },
  {
    id: 'delete_account',
    label: 'Delete my account',
    title: 'Account deletion request',
    prefill: `Team ID:
Confirm you want all account data permanently deleted (yes / no):
Anything else we should know: `,
  },
  {
    id: 'change_account_owner',
    label: 'Change account owner or team email',
    title: 'Account owner change',
    prefill: `Team ID:
Current owner email:
New owner email:
Confirm the new owner has already created an E2B account with the new email (yes / no): `,
  },
  {
    id: 'increase_limit',
    label: 'Increase a limit (concurrency, RAM, disk, build)',
    title: 'Limit increase request',
    prefill: `Team ID:
Which limit you want raised (concurrent sandboxes, RAM per sandbox, disk per sandbox, concurrent builds):
Current value:
Target value:
Brief use case: `,
  },
  {
    id: 'volumes_access',
    label: 'Volumes access',
    title: 'Volumes access request',
    prefill: `Team ID:
What you plan to use volumes for:
Approximate volume size and access pattern (e.g. 50 GB read-mostly, shared across sandboxes):
Region preference (currently us-west1 only): `,
  },
  {
    id: 'eu_cluster',
    label: 'EU cluster or data residency',
    title: 'EU cluster / data residency request',
    prefill: `Team ID:
Specific data residency requirement (region, regulation, customer ask):
Timeline: `,
  },
  {
    id: 'enterprise_inquiry',
    label: 'Enterprise inquiry',
    title: 'Enterprise inquiry',
    prefill: `Company:
Use case:
Current scale (sandboxes per day or month):
Expected scale at 6 months:
Timeline: `,
  },
  {
    id: 'startup_program',
    label: 'Startup program',
    title: 'Startup program inquiry',
    prefill: `Company:
Stage (pre-seed, seed, Series A, etc.):
Current E2B usage (if any):
What you are building: `,
  },
  {
    id: 'something_else',
    label: 'Something else',
    title: 'Support Request',
    prefill: '',
  },
] as const

export type SupportTemplate = (typeof SUPPORT_TEMPLATES)[number]
export type SupportTemplateId = SupportTemplate['id']

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
