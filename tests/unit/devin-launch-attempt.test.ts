import { webcrypto } from 'node:crypto'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { getDevinLaunchAttempt } from '@/features/dashboard/connections/devin-launch-attempt'

beforeAll(() => {
  vi.stubGlobal('crypto', webcrypto)
})

afterEach(() => {
  vi.stubGlobal('crypto', webcrypto)
})

const payload = {
  apiUrl: 'https://api.devin.ai',
  outpostsToken: 'scoped-token',
  poolId: 'pool-1',
}

describe('Devin launch attempt identity', () => {
  it('calls the browser UUID generator with its Crypto receiver', async () => {
    const brandedCrypto = {
      randomUUID() {
        if (this !== brandedCrypto) throw new TypeError('Illegal invocation')
        return 'operation-1'
      },
      subtle: webcrypto.subtle,
    }
    vi.stubGlobal('crypto', brandedCrypto)

    await expect(getDevinLaunchAttempt(null, payload)).resolves.toMatchObject({
      operationId: 'operation-1',
    })
  })

  it('reuses the operation ID only for the exact launch payload', async () => {
    const createOperationId = vi
      .fn()
      .mockReturnValueOnce('operation-1')
      .mockReturnValueOnce('operation-2')
    const first = await getDevinLaunchAttempt(null, payload, createOperationId)

    await expect(
      getDevinLaunchAttempt(first, { ...payload }, createOperationId)
    ).resolves.toEqual(first)
    await expect(
      getDevinLaunchAttempt(
        first,
        { ...payload, poolId: 'pool-2' },
        createOperationId
      )
    ).resolves.toMatchObject({ operationId: 'operation-2' })
    expect(createOperationId).toHaveBeenCalledTimes(2)
  })

  it('does not retain the credential in the retry identity', async () => {
    const attempt = await getDevinLaunchAttempt(
      null,
      payload,
      () => 'operation-1'
    )

    expect(JSON.stringify(attempt)).not.toContain(payload.outpostsToken)
  })
})
