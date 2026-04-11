import { createContextKey, context as otelContext } from '@opentelemetry/api'

type HeaderStore = Pick<Headers, 'get'>

export type RequestObservabilityContext = {
  request_url?: string
  request_path?: string
  transport?: string
  handler_name?: string
}

const REQUEST_OBSERVABILITY_CONTEXT_KEY = createContextKey(
  'request-observability-context'
)

function safelyParseUrl(url: string): URL | null {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

function deriveOriginFromHeaders(headers: HeaderStore): string | undefined {
  const origin = headers.get('origin')
  if (origin) {
    return origin
  }

  const host = headers.get('x-forwarded-host') ?? headers.get('host')
  const proto = headers.get('x-forwarded-proto') ?? 'https'

  if (!host) {
    return undefined
  }

  return `${proto}://${host}`
}

export function createRequestObservabilityContext(input: {
  requestUrl?: string
  requestPath?: string
  fallbackPath?: string
  transport?: string
  handlerName?: string
}): RequestObservabilityContext {
  const parsedUrl = input.requestUrl ? safelyParseUrl(input.requestUrl) : null
  const requestPath =
    input.requestPath ?? parsedUrl?.pathname ?? input.fallbackPath

  return {
    request_url: parsedUrl?.toString() ?? input.requestUrl,
    request_path: requestPath,
    transport: input.transport,
    handler_name: input.handlerName,
  }
}

export function createRequestObservabilityContextFromHeaders(
  headers: HeaderStore,
  input: {
    requestUrl?: string
    fallbackPath?: string
    transport?: string
    handlerName?: string
    preferReferer?: boolean
  } = {}
): RequestObservabilityContext {
  const referer = headers.get('referer') ?? undefined
  const nextUrl = headers.get('next-url') ?? undefined
  const origin = deriveOriginFromHeaders(headers)

  const normalizedNextUrl =
    nextUrl && !nextUrl.startsWith('http') && origin
      ? `${origin}${nextUrl}`
      : nextUrl

  const requestUrl = input.preferReferer
    ? (referer ?? input.requestUrl ?? normalizedNextUrl)
    : (input.requestUrl ?? normalizedNextUrl ?? referer)
  const requestPath =
    requestUrl === referer && referer
      ? undefined
      : nextUrl && !nextUrl.startsWith('http')
        ? nextUrl
        : undefined

  return createRequestObservabilityContext({
    requestUrl,
    requestPath,
    fallbackPath: input.fallbackPath,
    transport: input.transport,
    handlerName: input.handlerName,
  })
}

export function getRequestObservabilityContext():
  | RequestObservabilityContext
  | undefined {
  const activeContext = otelContext.active()

  return activeContext.getValue(REQUEST_OBSERVABILITY_CONTEXT_KEY) as
    | RequestObservabilityContext
    | undefined
}

export function withRequestObservabilityContext<T>(
  requestContext: RequestObservabilityContext,
  fn: () => T
): T {
  return otelContext.with(
    otelContext
      .active()
      .setValue(REQUEST_OBSERVABILITY_CONTEXT_KEY, requestContext),
    fn
  )
}

export function withRequestObservabilityFromRequest<T>(
  request: Pick<Request, 'url'>,
  input: {
    fallbackPath?: string
    transport?: string
    handlerName?: string
  },
  fn: () => T
): T {
  return withRequestObservabilityContext(
    createRequestObservabilityContext({
      requestUrl: request.url,
      fallbackPath: input.fallbackPath,
      transport: input.transport,
      handlerName: input.handlerName,
    }),
    fn
  )
}

export function formatRequestLogMessage(
  message: string | undefined,
  requestContext: RequestObservabilityContext | undefined
): string | undefined {
  if (!message || !requestContext?.request_path) {
    return message
  }

  return `${requestContext.request_path}: ${message}`
}
