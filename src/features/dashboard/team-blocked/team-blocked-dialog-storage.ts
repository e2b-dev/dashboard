import type { TeamBlockedReason } from '@/core/modules/teams/models'

// Builds the dismissed-dialog session key; ("acme", "verification required") -> "team-blocked-dialog-dismissed:acme:verification required".
const getBlockedDialogStorageKey = (
  teamSlug: string,
  blockedReason: TeamBlockedReason
) => {
  return `team-blocked-dialog-dismissed:${teamSlug}:${blockedReason}`
}

export { getBlockedDialogStorageKey }
