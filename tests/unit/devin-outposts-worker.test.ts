import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  infraDelete: vi.fn(),
  infraGet: vi.fn(),
  infraPost: vi.fn(),
  runtime: undefined as ReturnType<typeof sandboxWithResults> | undefined,
}))

vi.mock('@/core/shared/clients/api', () => ({
  infra: {
    DELETE: mocks.infraDelete,
    GET: mocks.infraGet,
    POST: mocks.infraPost,
  },
}))

vi.mock('e2b', () => ({
  Sandbox: class {
    commands: ReturnType<typeof vi.fn>

    constructor() {
      if (!mocks.runtime) throw new Error('missing mocked sandbox runtime')
      this.commands = mocks.runtime.commands
    }
  },
}))

import {
  DevinWorkerLaunchError,
  disconnectDevinWorkers,
  findStartedDevinWorker,
  launchDevinWorker,
} from '@/core/modules/devin-outposts/worker.server'

const input = {
  accessToken: 'dashboard-access-token',
  apiUrl: 'https://api.devin.ai',
  operationId: '17d18dac-86d9-4a79-91e7-4477bd29327e',
  outpostsToken: 'scoped-outposts-token',
  poolId: 'pool-1',
  teamId: 'team-1',
  userId: 'user-1',
}

describe('Devin worker launcher', () => {
  beforeEach(() => {
    mocks.infraDelete.mockReset()
    mocks.infraGet.mockReset()
    mocks.infraPost.mockReset()
    mocks.runtime = undefined
    mocks.infraPost.mockImplementation((path: string) => {
      if (path === '/sandboxes') {
        return apiResult(201, sandboxApiResponse('new-sbx'))
      }
      if (path === '/sandboxes/{sandboxID}/connect') {
        return apiResult(200, sandboxApiResponse('new-sbx'))
      }
      throw new Error(`unexpected path ${path}`)
    })
    mocks.infraDelete.mockResolvedValue(apiResult(204))
    mocks.infraGet.mockResolvedValue(apiResult(200, []))
  })

  it('starts the worker through the bearer-authenticated sandbox API', async () => {
    const sandbox = sandboxWithResults([
      { exitCode: 0, stdout: '' },
      { exitCode: 0, stdout: 'stopped' },
      { exitCode: 0, stdout: '4242' },
    ])
    mocks.runtime = sandbox

    await expect(launchDevinWorker(input)).resolves.toMatchObject({
      reused: false,
      sandboxId: 'new-sbx',
      workerPid: '4242',
    })

    expect(mocks.infraPost).toHaveBeenNthCalledWith(
      1,
      '/sandboxes',
      expect.objectContaining({
        body: expect.objectContaining({
          autoPause: false,
          autoResume: { enabled: false },
          timeout: 1800,
        }),
        headers: {
          Authorization: 'Bearer dashboard-access-token',
          'X-Team-ID': 'team-1',
        },
      })
    )
    expect(mocks.infraPost).toHaveBeenNthCalledWith(
      4,
      '/sandboxes/{sandboxID}/connect',
      expect.objectContaining({
        body: { timeout: 86_400 },
        params: { path: { sandboxID: 'new-sbx' } },
      })
    )
  })

  it('reuses a worker that is already marked as running', async () => {
    mocks.infraGet.mockResolvedValue(
      apiResult(200, [sandboxApiResponse('existing-sbx')])
    )
    mocks.infraPost.mockImplementation((path: string) => {
      if (path === '/sandboxes/{sandboxID}/connect') {
        return apiResult(200, sandboxApiResponse('existing-sbx'))
      }
      throw new Error(`unexpected path ${path}`)
    })
    mocks.runtime = sandboxWithResults([
      { exitCode: 0, stdout: '' },
      { exitCode: 0, stdout: 'running' },
    ])

    await expect(launchDevinWorker(input)).resolves.toMatchObject({
      reused: true,
      sandboxId: 'existing-sbx',
      workerPid: null,
    })
    expect(mocks.runtime.commands.run).toHaveBeenCalledTimes(2)
    expect(mocks.infraPost).not.toHaveBeenCalledWith(
      '/sandboxes',
      expect.anything()
    )
  })

  it('keeps the scoped credential out of metadata and command text', async () => {
    const sandbox = sandboxWithResults([
      { exitCode: 0, stdout: '' },
      { exitCode: 0, stdout: 'stopped' },
      { exitCode: 0, stdout: '4242' },
    ])
    mocks.runtime = sandbox

    await launchDevinWorker(input)

    const createCall = mocks.infraPost.mock.calls[0]?.[1]
    expect(createCall.body.metadata).not.toEqual(
      expect.objectContaining({ token: expect.anything() })
    )
    const persistCall = sandbox.commands.run.mock.calls[0]
    const startCall = sandbox.commands.run.mock.calls[2]
    expect(startCall?.[0]).not.toContain(input.outpostsToken)
    expect(persistCall?.[1]).toEqual(
      expect.objectContaining({
        envs: expect.objectContaining({
          DEVIN_OUTPOSTS_TOKEN: input.outpostsToken,
        }),
      })
    )
  })

  it('kills the prepared sandbox when worker startup fails', async () => {
    mocks.runtime = sandboxWithResults([
      { exitCode: 0, stdout: '' },
      { exitCode: 0, stdout: 'stopped' },
      { exitCode: 1, stdout: '' },
    ])

    await expect(launchDevinWorker(input)).rejects.toBeInstanceOf(
      DevinWorkerLaunchError
    )
    expect(mocks.infraDelete).toHaveBeenCalledWith(
      '/sandboxes/{sandboxID}',
      expect.objectContaining({
        params: { path: { sandboxID: 'new-sbx' } },
      })
    )
  })

  it('kills the prepared sandbox when credential persistence fails', async () => {
    mocks.runtime = sandboxWithResults([{ exitCode: 1, stdout: '' }])

    await expect(launchDevinWorker(input)).rejects.toBeInstanceOf(
      DevinWorkerLaunchError
    )
    expect(mocks.infraDelete).toHaveBeenCalledWith(
      '/sandboxes/{sandboxID}',
      expect.objectContaining({
        params: { path: { sandboxID: 'new-sbx' } },
      })
    )
  })

  it('reports a prepared sandbox that could not be cleaned up', async () => {
    mocks.runtime = sandboxWithResults([
      { exitCode: 0, stdout: '' },
      { exitCode: 0, stdout: 'stopped' },
      { exitCode: 1, stdout: '' },
    ])
    mocks.infraDelete.mockResolvedValue(apiResult(500))

    await expect(launchDevinWorker(input)).rejects.toMatchObject({
      orphanedSandboxId: 'new-sbx',
    })
  })

  it('finds a started worker for callback response-loss recovery', async () => {
    mocks.infraGet.mockResolvedValue(
      apiResult(200, [sandboxApiResponse('existing-sbx')])
    )
    mocks.infraPost.mockResolvedValue(
      apiResult(200, sandboxApiResponse('existing-sbx'))
    )
    mocks.runtime = sandboxWithResults([{ exitCode: 0, stdout: 'running' }])

    await expect(findStartedDevinWorker(input)).resolves.toBe('existing-sbx')
    expect(mocks.infraPost).toHaveBeenNthCalledWith(
      1,
      '/sandboxes/{sandboxID}/connect',
      expect.objectContaining({ body: { timeout: 1800 } })
    )
    expect(mocks.infraPost).toHaveBeenNthCalledWith(
      2,
      '/sandboxes/{sandboxID}/connect',
      expect.objectContaining({ body: { timeout: 86_400 } })
    )
  })

  it('does not report an incomplete worker as recovered', async () => {
    mocks.infraGet.mockResolvedValue(
      apiResult(200, [sandboxApiResponse('existing-sbx')])
    )
    mocks.infraPost.mockResolvedValue(
      apiResult(200, sandboxApiResponse('existing-sbx'))
    )
    mocks.runtime = sandboxWithResults([{ exitCode: 0, stdout: 'stopped' }])

    await expect(findStartedDevinWorker(input)).resolves.toBeNull()
    expect(mocks.infraPost).toHaveBeenCalledTimes(1)
    expect(mocks.infraPost).toHaveBeenCalledWith(
      '/sandboxes/{sandboxID}/connect',
      expect.objectContaining({ body: { timeout: 1800 } })
    )
  })

  it('disconnects every Devin worker owned by the current user', async () => {
    mocks.infraGet
      .mockResolvedValueOnce(
        apiResult(200, [sandboxApiResponse('worker-1')], {
          'X-Next-Token': 'next-page',
        })
      )
      .mockResolvedValueOnce(apiResult(200, [sandboxApiResponse('worker-2')]))

    await expect(disconnectDevinWorkers(input)).resolves.toEqual({ count: 2 })
    expect(mocks.infraDelete).toHaveBeenCalledTimes(2)
    expect(mocks.infraDelete).toHaveBeenCalledWith(
      '/sandboxes/{sandboxID}',
      expect.objectContaining({
        params: { path: { sandboxID: 'worker-1' } },
      })
    )
    expect(mocks.infraGet).toHaveBeenNthCalledWith(
      1,
      '/v2/sandboxes',
      expect.objectContaining({
        params: {
          query: expect.objectContaining({
            nextToken: undefined,
            state: ['running', 'paused'],
          }),
        },
      })
    )
    expect(mocks.infraGet).toHaveBeenNthCalledWith(
      2,
      '/v2/sandboxes',
      expect.objectContaining({
        params: {
          query: expect.objectContaining({ nextToken: 'next-page' }),
        },
      })
    )
  })
})

function sandboxWithResults(
  results: Array<{ exitCode: number; stdout: string }>
) {
  return {
    commands: { run: vi.fn().mockImplementation(() => results.shift()) },
  }
}

function sandboxApiResponse(sandboxId: string) {
  return {
    clientID: 'client-1',
    domain: 'e2b.app',
    envdAccessToken: 'envd-token',
    envdVersion: '0.1.0',
    metadata: {
      devinLaunchOperationId: input.operationId,
      source: 'dashboard-devin-outposts',
      userId: input.userId,
    },
    sandboxID: sandboxId,
    templateID: 'devin-outposts',
  }
}

function apiResult(
  status: number,
  data?: unknown,
  headers: Record<string, string> = {}
) {
  return {
    data,
    response: {
      headers: new Headers(headers),
      ok: status >= 200 && status < 300,
      status,
    },
  }
}
