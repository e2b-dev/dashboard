import type { Attributes, TextMapGetter } from '@opentelemetry/api'
import type { AttributesFromHeaders } from '@vercel/otel'
import type { VercelRequestContext } from './api'
import { getVercelRequestContext } from './api'
import * as SemanticAttributes from './semantic-attributes'

/** @internal */
export function parseRequestId(header: string | undefined): string | undefined {
  if (!header) {
    return undefined
  }
  const parts = header.split('::')
  return parts.at(-1)
}

/** @internal */
export function omitUndefinedAttributes<T extends Attributes = Attributes>(
  obj: T
): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  ) as T
}

/** @internal */
export function getVercelRequestContextAttributes(
  context: VercelRequestContext | undefined = getVercelRequestContext(),
  attributesFromHeaders?: AttributesFromHeaders
): Attributes | undefined {
  if (!context) {
    return undefined
  }

  const rootAttrs = attributesFromHeaders
    ? resolveAttributesFromHeaders(attributesFromHeaders, context.headers)
    : undefined

  return omitUndefinedAttributes({
    [SemanticAttributes.HTTP_HOST]: context.headers.host,
    [SemanticAttributes.HTTP_USER_AGENT]: context.headers['user-agent'],
    'http.referer': context.headers.referer,

    'vercel.request_id': parseRequestId(context.headers['x-vercel-id']),
    'vercel.matched_path': context.headers['x-matched-path'],
    'vercel.edge_region': process.env.VERCEL_REGION,

    ...rootAttrs,
  })
}

type VercelRequestContextHeaders = VercelRequestContext['headers']

const getter: TextMapGetter<VercelRequestContextHeaders> = {
  keys(_carrier: VercelRequestContextHeaders): string[] {
    return []
  },
  get(
    carrier: VercelRequestContextHeaders,
    key: string
  ): string | string[] | undefined {
    return carrier[key.toLocaleLowerCase()]
  },
}

function resolveAttributesFromHeaders(
  attributesFromHeaders: AttributesFromHeaders,
  headers: VercelRequestContextHeaders
): Attributes | undefined {
  if (typeof attributesFromHeaders === 'function') {
    return attributesFromHeaders(headers, getter)
  }

  const attrs: Attributes = {}
  for (const [attrName, headerName] of Object.entries(attributesFromHeaders)) {
    const headerValue = headers[headerName.toLocaleLowerCase()]
    if (headerValue !== undefined) {
      attrs[attrName] = headerValue
    }
  }
  return attrs
}
