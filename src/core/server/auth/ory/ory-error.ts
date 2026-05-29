import { ResponseError } from '@ory/client-fetch'

export type OryErrorDetails = {
  status: number
  url: string
  code?: number
  reason?: string
  message?: string
  request_id?: string
  body?: string
}

// Ory returns a structured error envelope like
//   { "error": { "code": 401, "status": "Unauthorized", "reason": "...", "message": "...", "id": "..." } }
// The SDK's ResponseError doesn't unpack it, so we read the body here to
// surface the actual cause instead of "Response returned an error code".
export async function readOryError(
  error: ResponseError
): Promise<OryErrorDetails> {
  const { response } = error
  const base: OryErrorDetails = { status: response.status, url: response.url }

  let raw: string
  try {
    raw = await response.clone().text()
  } catch {
    return base
  }

  try {
    const parsed = JSON.parse(raw) as {
      error?: {
        code?: unknown
        reason?: unknown
        message?: unknown
        id?: unknown
        request?: unknown
      }
    }
    const oryError = parsed.error ?? {}
    return {
      ...base,
      code: typeof oryError.code === 'number' ? oryError.code : undefined,
      reason: stringOrUndefined(oryError.reason),
      message: stringOrUndefined(oryError.message),
      request_id:
        stringOrUndefined(oryError.id) ?? stringOrUndefined(oryError.request),
    }
  } catch {
    return { ...base, body: raw.slice(0, 500) }
  }
}

export function isOryResponseError(error: unknown): error is ResponseError {
  return error instanceof ResponseError
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}
