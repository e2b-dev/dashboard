import { ResponseError } from '@ory/client-fetch'
import { describe, expect, it } from 'vitest'
import { readOryError } from '@/core/server/auth/ory/ory-error'

function responseWithUrl(url: string): Response {
  const response = new Response(
    JSON.stringify({
      error: {
        code: 401,
        message: 'not authorized',
        id: 'req-id',
      },
    }),
    { status: 401 }
  )
  Object.defineProperty(response, 'url', { value: url })
  return response
}

describe('readOryError', () => {
  it('keeps only the response path for logs', async () => {
    const details = await readOryError(
      new ResponseError(
        responseWithUrl(
          'https://project.oryapis.com/admin/identities?email=user%40example.com'
        )
      )
    )

    expect(details).toEqual({
      status: 401,
      path: '/admin/identities',
      code: 401,
      message: 'not authorized',
      request_id: 'req-id',
    })
    expect(details).not.toHaveProperty('url')
  })
})
