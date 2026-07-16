type DevinLaunchPayload = {
  apiUrl: string
  outpostsToken: string
  poolId: string
}

export type DevinLaunchAttempt = {
  fingerprint: string
  operationId: string
}

export async function getDevinLaunchAttempt(
  previous: DevinLaunchAttempt | null,
  payload: DevinLaunchPayload,
  createOperationId: () => string = () => crypto.randomUUID()
) {
  const fingerprint = await launchFingerprint(payload)
  if (previous?.fingerprint === fingerprint) return previous
  return { fingerprint, operationId: createOperationId() }
}

async function launchFingerprint(payload: DevinLaunchPayload) {
  const serialized = JSON.stringify([
    payload.apiUrl.trim(),
    payload.poolId.trim(),
    payload.outpostsToken.trim(),
  ])
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(serialized)
  )
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('')
}
