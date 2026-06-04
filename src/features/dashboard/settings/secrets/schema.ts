import { z } from 'zod'
import { MAX_SECRET_HOSTS } from './constants'

const HOST_REGEX = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*$/

const HostValueSchema = z
  .string()
  .trim()
  .min(1, 'Host is required')
  .max(253, 'Host is too long')
  .regex(HOST_REGEX, 'Enter a valid host (e.g. api.openai.com)')

// Hosts are wrapped in `{ value }` objects because RHF's `useFieldArray`
// only accepts paths whose value is an array of objects — arrays of
// primitives resolve to `never` in `FieldArrayPath`. `flattenHosts` below
// unwraps them before handing off to the backend.
export const HostSchema = z.object({ value: HostValueSchema })

// allowList stays a flat object (not a discriminatedUnion) so RHF can walk
// `allowList.hosts` cleanly; the 'specific' non-empty requirement lives in
// the `.superRefine` below.
const SecretFormShape = z.object({
  label: z
    .string()
    .trim()
    .min(1, 'Label is required')
    .max(64, 'Label is too long'),
  value: z.string().min(1, 'Secret value is required'),
  description: z.string().trim().max(120, 'Description is too long'),
  allowList: z.object({
    mode: z.enum(['all', 'specific']),
    hosts: z
      .array(HostSchema)
      .max(MAX_SECRET_HOSTS, `Limit of ${MAX_SECRET_HOSTS} hosts reached`),
  }),
})

export const SecretFormSchema = SecretFormShape.superRefine((data, ctx) => {
  if (data.allowList.mode === 'specific' && data.allowList.hosts.length === 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['allowList', 'hosts'],
      message: 'Add at least one host',
    })
  }
})

// Hand-written rather than `z.input<typeof SecretFormShape>`: `z.input` on a
// zod object isn't always eagerly expanded for RHF's deeply-recursive
// `FieldArrayPath` walker, and we want this type to be obviously a plain
// object shape. `type` (not `interface`) so it satisfies RHF's
// `FieldValues = Record<string, any>` constraint.
export type SecretFormInput = {
  label: string
  value: string
  description: string
  allowList: {
    mode: 'all' | 'specific'
    hosts: { value: string }[]
  }
}

export type SecretFormOutput = SecretFormInput

/** Unwrap the `{ value }`-wrapped hosts back into plain strings for the BE. */
export function flattenHosts(hosts: { value: string }[]): string[] {
  return hosts.map((h) => h.value)
}
