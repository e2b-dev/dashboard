import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTRPCContext } from '@/core/server/trpc/init'

/**
 * The sandbox router builds the E2B SDK connection options per request. A
 * prebuilt image is configured with E2B_INFRA_API_URL at server start, so the
 * control-plane calls have to resolve their API URL the same way the API
 * clients do — reading the build-time NEXT_PUBLIC_ value directly would point
 * a self-hosted install at whatever host the image was built for.
 */

const sdkMock = vi.hoisted(() => ({
  connect: vi.fn(),
  create: vi.fn(),
  getFullInfo: vi.fn(),
  pause: vi.fn(),
}))

vi.mock('e2b', () => ({
  Sandbox: {
    connect: sdkMock.connect,
    create: sdkMock.create,
    getFullInfo: sdkMock.getFullInfo,
    pause: sdkMock.pause,
  },
  TimeoutError: class TimeoutError extends Error {},
}))

const authMock = vi.hoisted(() => ({ getApiKey: vi.fn() }))
vi.mock('@/core/server/auth', () => ({
  getApiKey: authMock.getApiKey,
}))

const { createCallerFactory } = await import('@/core/server/trpc/init')
const { sandboxRouter } = await import('@/core/server/api/routers/sandbox')

const createCaller = createCallerFactory(sandboxRouter)

async function caller() {
  const ctx = await createTRPCContext({ headers: new Headers() })
  return createCaller(ctx)
}

const RUNTIME_API_URL = 'http://127.0.0.1:3000'
const MANAGED_KEYS = [
  'E2B_INFRA_API_URL',
  'E2B_SANDBOX_URL',
  'NEXT_PUBLIC_INFRA_API_URL',
  'NEXT_PUBLIC_E2B_SANDBOX_URL',
] as const
const saved = new Map<string, string | undefined>()

const withRuntimeApiUrl = expect.objectContaining({ apiUrl: RUNTIME_API_URL })

beforeEach(() => {
  vi.clearAllMocks()

  for (const key of MANAGED_KEYS) {
    saved.set(key, process.env[key])
    delete process.env[key]
  }
  process.env.E2B_INFRA_API_URL = RUNTIME_API_URL

  authMock.getApiKey.mockResolvedValue('e2b_test_api_key')
  sdkMock.connect.mockResolvedValue({
    sandboxId: 'sbxexisting',
    pty: { kill: vi.fn().mockResolvedValue(true) },
  })
  sdkMock.create.mockResolvedValue({ sandboxId: 'sbxnew' })
  sdkMock.getFullInfo.mockResolvedValue({
    sandboxDomain: 'sandbox.example.com',
    envdVersion: '0.2.0',
    envdAccessToken: 'envd-token',
  })
  sdkMock.pause.mockResolvedValue(true)
})

afterEach(() => {
  for (const key of MANAGED_KEYS) {
    const value = saved.get(key)
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
})

describe('sandbox router control-plane API URL', () => {
  it('openTerminal connects through the runtime API URL', async () => {
    const c = await caller()
    await c.openTerminal({ template: 'base', sandboxId: 'sbxexisting' })

    expect(sdkMock.connect).toHaveBeenCalledWith(
      'sbxexisting',
      withRuntimeApiUrl
    )
  })

  it('openTerminal creates through the runtime API URL', async () => {
    const c = await caller()
    await c.openTerminal({ template: 'base' })

    expect(sdkMock.create).toHaveBeenCalledWith('base', withRuntimeApiUrl)
  })

  it('resume connects and reads info through the runtime API URL', async () => {
    const c = await caller()
    await c.resume({ sandboxId: 'sbxexisting' })

    expect(sdkMock.connect).toHaveBeenCalledWith(
      'sbxexisting',
      withRuntimeApiUrl
    )
    expect(sdkMock.getFullInfo).toHaveBeenCalledWith(
      'sbxexisting',
      withRuntimeApiUrl
    )
  })

  it('pause pauses through the runtime API URL', async () => {
    const c = await caller()
    await c.pause({ sandboxId: 'sbxexisting' })

    expect(sdkMock.pause).toHaveBeenCalledWith('sbxexisting', withRuntimeApiUrl)
  })

  it('killTerminalPty connects through the runtime API URL', async () => {
    const c = await caller()
    await c.killTerminalPty({ sandboxId: 'sbxexisting', pid: 42 })

    expect(sdkMock.connect).toHaveBeenCalledWith(
      'sbxexisting',
      withRuntimeApiUrl
    )
  })

  it('falls back to the NEXT_PUBLIC value when no runtime URL is set', async () => {
    delete process.env.E2B_INFRA_API_URL
    process.env.NEXT_PUBLIC_INFRA_API_URL = 'https://api.public.example'

    const c = await caller()
    await c.resume({ sandboxId: 'sbxexisting' })

    expect(sdkMock.connect).toHaveBeenCalledWith(
      'sbxexisting',
      expect.objectContaining({ apiUrl: 'https://api.public.example' })
    )
  })
})

/**
 * The sandbox URL travels in the same connection options, so a prebuilt image
 * has to read it the same way — otherwise the server talks to one sandbox host
 * and the browser, which reads `GET /api/config`, talks to another.
 */
describe('sandbox router sandbox URL', () => {
  it('passes the runtime sandbox URL to the control plane', async () => {
    process.env.E2B_SANDBOX_URL = 'https://sandbox.internal.example'

    const c = await caller()
    await c.openTerminal({ template: 'base', sandboxId: 'sbxexisting' })

    expect(sdkMock.connect).toHaveBeenCalledWith(
      'sbxexisting',
      expect.objectContaining({
        sandboxUrl: 'https://sandbox.internal.example',
      })
    )
  })

  it('prefers the runtime sandbox URL over the NEXT_PUBLIC one', async () => {
    process.env.NEXT_PUBLIC_E2B_SANDBOX_URL = 'http://sandbox.lvh.me:3002'
    process.env.E2B_SANDBOX_URL = 'https://sandbox.internal.example'

    const c = await caller()
    await c.pause({ sandboxId: 'sbxexisting' })

    expect(sdkMock.pause).toHaveBeenCalledWith(
      'sbxexisting',
      expect.objectContaining({
        sandboxUrl: 'https://sandbox.internal.example',
      })
    )
  })

  it('falls back to the NEXT_PUBLIC sandbox URL', async () => {
    process.env.NEXT_PUBLIC_E2B_SANDBOX_URL = 'http://sandbox.lvh.me:3002'

    const c = await caller()
    await c.killTerminalPty({ sandboxId: 'sbxexisting', pid: 42 })

    expect(sdkMock.connect).toHaveBeenCalledWith(
      'sbxexisting',
      expect.objectContaining({ sandboxUrl: 'http://sandbox.lvh.me:3002' })
    )
  })

  // The request-host default is a browser convenience: the server cannot
  // assume it can reach its own public host on the sandbox port.
  it('passes no sandbox URL when none is configured', async () => {
    const c = await caller()
    await c.resume({ sandboxId: 'sbxexisting' })

    expect(sdkMock.connect).toHaveBeenCalledWith(
      'sbxexisting',
      expect.objectContaining({ sandboxUrl: undefined })
    )
  })
})
