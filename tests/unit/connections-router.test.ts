import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTRPCContext } from '@/core/server/trpc/init'
import { l } from '@/core/shared/clients/logger/logger'

const mocks = vi.hoisted(() => ({
  createDevinPool: vi.fn(),
  disconnectDevinWorkers: vi.fn(),
  discoverDevinAccount: vi.fn(),
  featureEnabled: vi.fn(),
  getAuthContext: vi.fn(),
  getTeamIdFromSlug: vi.fn(),
  launchDevinWorker: vi.fn(),
  normalizeDevinApiUrl: vi.fn(),
}))

vi.mock('@/core/server/auth', () => ({
  getAuthContext: mocks.getAuthContext,
}))

vi.mock('@/core/server/functions/team/get-team-id-from-slug', () => ({
  getTeamIdFromSlug: mocks.getTeamIdFromSlug,
}))

vi.mock('@/core/modules/feature-flags/feature-flags.server', () => ({
  featureFlags: { isEnabled: mocks.featureEnabled },
}))

vi.mock('@/core/modules/devin-outposts/client.server', () => ({
  DevinConnectionError: class DevinConnectionError extends Error {
    constructor(
      message: string,
      readonly kind: string,
      readonly status?: number
    ) {
      super(message)
    }
  },
  createDevinPool: mocks.createDevinPool,
  discoverDevinAccount: mocks.discoverDevinAccount,
  normalizeDevinApiUrl: mocks.normalizeDevinApiUrl,
}))

vi.mock('@/core/modules/devin-outposts/worker.server', () => ({
  DevinWorkerLaunchError: class DevinWorkerLaunchError extends Error {},
  disconnectDevinWorkers: mocks.disconnectDevinWorkers,
  launchDevinWorker: mocks.launchDevinWorker,
}))

const { createCallerFactory } = await import('@/core/server/trpc/init')
const { DevinConnectionError } = await import(
  '@/core/modules/devin-outposts/client.server'
)
const { connectionsRouter } = await import(
  '@/core/server/api/routers/connections'
)

const createCaller = createCallerFactory(connectionsRouter)
const infoSpy = vi.spyOn(l, 'info').mockImplementation(() => undefined)
const warnSpy = vi.spyOn(l, 'warn').mockImplementation(() => undefined)
const input = {
  teamSlug: 'customer-team',
  apiUrl: 'https://api.devin.ai',
  operationId: '17d18dac-86d9-4a79-91e7-4477bd29327e',
  outpostsToken: 'scoped-outposts-token',
  poolId: 'pool-1',
}

async function caller() {
  return createCaller(await createTRPCContext({ headers: new Headers() }))
}

describe('connectionsRouter.launchDevinWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthContext.mockResolvedValue({
      accessToken: 'dashboard-access-token',
      user: { id: 'user-1', email: 'user@example.com' },
    })
    mocks.getTeamIdFromSlug.mockResolvedValue({
      ok: true,
      data: 'resolved-team-id',
    })
    mocks.featureEnabled.mockResolvedValue(true)
    mocks.disconnectDevinWorkers.mockResolvedValue({ count: 1 })
    mocks.createDevinPool.mockResolvedValue({
      id: 'pool-created',
      name: 'new-pool',
      platform: 'linux',
    })
    mocks.discoverDevinAccount.mockResolvedValue({ pools: [] })
    mocks.launchDevinWorker.mockResolvedValue({
      acceptorId: 'acceptor-1',
      reused: false,
      sandboxId: 'sandbox-1',
      workerPid: '123',
    })
  })

  it('returns not found without launching when Connections is disabled', async () => {
    mocks.featureEnabled.mockResolvedValue(false)

    await expect(
      (await caller()).launchDevinWorker(input)
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })

    expect(mocks.featureEnabled).toHaveBeenCalledWith('connectionsEnabled', {
      user: { id: 'user-1', email: 'user@example.com' },
      team: { id: 'resolved-team-id' },
    })
    expect(mocks.launchDevinWorker).not.toHaveBeenCalled()
  })

  it('launches with the server-resolved session and team identity', async () => {
    await (await caller()).launchDevinWorker(input)

    expect(mocks.getTeamIdFromSlug).toHaveBeenCalledWith(
      'customer-team',
      'dashboard-access-token'
    )
    expect(mocks.launchDevinWorker).toHaveBeenCalledWith({
      accessToken: 'dashboard-access-token',
      apiUrl: input.apiUrl,
      operationId: input.operationId,
      outpostsToken: input.outpostsToken,
      poolId: input.poolId,
      teamId: 'resolved-team-id',
      userId: 'user-1',
    })
    const successLog = infoSpy.mock.calls.find(
      ([context]) => context.key === 'trpc:procedure_success'
    )?.[0]
    expect(successLog).toMatchObject({
      'trpc.procedure.input': {
        _apiUrl: 'string(20)',
        _operationId: 'string(36)',
        _outpostsToken: 'string(21)',
        _poolId: 'string(6)',
        teamSlug: 'customer-team',
      },
    })
    expect(JSON.stringify(successLog)).not.toContain(input.outpostsToken)
  })

  it('disconnects with the server-resolved session and team identity', async () => {
    await (await caller()).disconnectDevinWorkers({
      confirm: true,
      teamSlug: input.teamSlug,
    })

    expect(mocks.disconnectDevinWorkers).toHaveBeenCalledWith({
      accessToken: 'dashboard-access-token',
      teamId: 'resolved-team-id',
      userId: 'user-1',
    })
  })

  it('creates a pool after checking for a duplicate with the same credential', async () => {
    mocks.normalizeDevinApiUrl.mockReturnValue(input.apiUrl)
    mocks.discoverDevinAccount.mockResolvedValue({ pools: [] })

    await expect(
      (await caller()).createDevinPool({
        apiKey: 'service-user-key',
        apiUrl: input.apiUrl,
        name: 'new-pool',
        teamSlug: input.teamSlug,
      })
    ).resolves.toEqual({
      pool: {
        id: 'pool-created',
        name: 'new-pool',
        platform: 'linux',
      },
    })

    expect(mocks.discoverDevinAccount).toHaveBeenCalledWith(
      input.apiUrl,
      'service-user-key'
    )
    expect(mocks.createDevinPool).toHaveBeenCalledWith(
      input.apiUrl,
      'service-user-key',
      {
        description: 'E2B Devin Outposts pool (new-pool)',
        name: 'new-pool',
      }
    )
    const successLog = infoSpy.mock.calls.find(
      ([context]) => context['trpc.procedure.name'] === 'createDevinPool'
    )?.[0]
    expect(successLog).toMatchObject({
      'trpc.procedure.input': {
        _apiKey: 'string(16)',
        _apiUrl: 'string(20)',
        _name: 'string(8)',
        teamSlug: 'customer-team',
      },
    })
    expect(JSON.stringify(successLog)).not.toContain('service-user-key')
  })

  it('rejects a duplicate pool before creating it', async () => {
    mocks.normalizeDevinApiUrl.mockReturnValue(input.apiUrl)
    mocks.discoverDevinAccount.mockResolvedValue({
      pools: [{ id: 'pool-existing', name: 'new-pool', platform: 'linux' }],
    })

    await expect(
      (await caller()).createDevinPool({
        apiKey: 'service-user-key',
        apiUrl: input.apiUrl,
        name: 'new-pool',
        teamSlug: input.teamSlug,
      })
    ).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(mocks.createDevinPool).not.toHaveBeenCalled()
  })

  it.each([
    [409, 'CONFLICT'],
    [400, 'BAD_REQUEST'],
    [422, 'BAD_REQUEST'],
  ] as const)('maps Devin create status %s to %s', async (status, code) => {
    mocks.normalizeDevinApiUrl.mockReturnValue(input.apiUrl)
    mocks.discoverDevinAccount.mockResolvedValue({ pools: [] })
    mocks.createDevinPool.mockRejectedValue(
      new DevinConnectionError('Create failed', 'provider', status)
    )

    await expect(
      (await caller()).createDevinPool({
        apiKey: 'service-user-key',
        apiUrl: input.apiUrl,
        name: 'new-pool',
        teamSlug: input.teamSlug,
      })
    ).rejects.toMatchObject({ code })
  })

  it.each([
    ['credentials', 'UNAUTHORIZED'],
    ['url', 'BAD_REQUEST'],
    ['provider', 'BAD_GATEWAY'],
    ['response', 'BAD_GATEWAY'],
  ] as const)('maps Devin %s errors to %s', async (kind, code) => {
    mocks.discoverDevinAccount.mockRejectedValue(
      new DevinConnectionError('Discovery failed', kind)
    )

    await expect(
      (await caller()).discoverDevin({
        apiKey: 'service-user-key',
        apiUrl: input.apiUrl,
        teamSlug: input.teamSlug,
      })
    ).rejects.toMatchObject({ code })

    if (kind === 'credentials') {
      const failureLog = warnSpy.mock.calls.find(
        ([context]) => context.key === 'trpc:procedure_failure'
      )?.[0]
      expect(failureLog).toMatchObject({
        'trpc.procedure.input': {
          _apiKey: 'string(16)',
          _apiUrl: 'string(20)',
          teamSlug: 'customer-team',
        },
      })
      expect(JSON.stringify(failureLog)).not.toContain('service-user-key')
    }
  })
})
