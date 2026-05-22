/**
 * Known reasons used by infra/billing services when blocking a team.
 *
 * These values are matched as case-insensitive substrings against the
 * `blocked_reason` column (see `teams.blocked_reason`) and against the
 * `team is blocked: <reason>` wire format returned by infra-api.
 *
 */
const TEAM_BLOCKED_REASONS = {
  missingPayment: 'missing payment method',
  verification: 'verification required',
  billingLimit: 'billing limit',
} as const

export { TEAM_BLOCKED_REASONS }
