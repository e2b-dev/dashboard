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

const REQUEST_HOST = 'dash.example:3001'
const REQUEST_URL = `http://${REQUEST_HOST}/api/trpc/sandbox.killTerminalPty`

async function caller(opts: { headers?: Headers; requestUrl?: string } = {}) {
  const ctx = await createTRPCContext({
    headers: opts.headers ?? new Headers(),
    requestUrl: opts.requestUrl,
  })
  return createCaller(ctx)
}

// A caller for a mutation that arrived over HTTP from a browser on
// REQUEST_HOST, which is how every one of these procedures is reached.
function requestCaller() {
  return caller({
    headers: new Headers({ host: REQUEST_HOST }),
    requestUrl: REQUEST_URL,
  })
}

const RUNTIME_API_URL = 'http://127.0.0.1:3000'
const MANAGED_KEYS = [
  'PUBLIC_E2B_DOMAIN',
  'PUBLIC_SANDBOX_URL',
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
  process.env.PUBLIC_E2B_DOMAIN = 'example.dev'

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

  it('uses the domain-derived API URL when no override is set', async () => {
    delete process.env.E2B_INFRA_API_URL
    const c = await caller()
    await c.resume({ sandboxId: 'sbxexisting' })
    expect(sdkMock.connect).toHaveBeenCalledWith(
      'sbxexisting',
      expect.objectContaining({ apiUrl: 'https://api.example.dev' })
    )
  })
})

describe('sandbox router sandbox URL', () => {
  it('passes the runtime sandbox URL to the control plane', async () => {
    process.env.PUBLIC_SANDBOX_URL = 'https://sandbox.internal.example'

    const c = await caller()
    await c.openTerminal({ template: 'base', sandboxId: 'sbxexisting' })

    expect(sdkMock.connect).toHaveBeenCalledWith(
      'sbxexisting',
      expect.objectContaining({
        sandboxUrl: 'https://sandbox.internal.example',
      })
    )
  })

  describe.each([
    undefined,
    'https://sandbox.configured.example',
  ])('request headers with sandbox URL %s', (sandboxUrl) => {
    it.each([
      { host: 'untrusted.example:3001' },
      {
        host: REQUEST_HOST,
        'x-forwarded-host': 'untrusted.example',
        'x-forwarded-proto': 'http',
      },
      {
        host: REQUEST_HOST,
        'x-forwarded-host': 'untrusted.example, proxy.example',
        'x-forwarded-proto': 'https,http',
      },
    ])('never uses request metadata for SDK destinations: %j', async (headers) => {
      if (sandboxUrl) process.env.PUBLIC_SANDBOX_URL = sandboxUrl
      const c = await caller({
        headers: new Headers(headers),
        requestUrl: 'http://untrusted-url.example/api/trpc',
      })
      await c.openTerminal({ template: 'base' })
      await c.resume({ sandboxId: 'sbxexisting' })
      await c.pause({ sandboxId: 'sbxexisting' })
      await c.killTerminalPty({ sandboxId: 'sbxexisting', pid: 42 })

      const options = expect.objectContaining({
        apiUrl: RUNTIME_API_URL,
        sandboxUrl,
      })
      expect(sdkMock.create).toHaveBeenCalledWith('base', options)
      expect(sdkMock.connect).toHaveBeenCalledTimes(2)
      for (const call of sdkMock.connect.mock.calls) {
        expect(call).toEqual(['sbxexisting', options])
      }
      expect(sdkMock.getFullInfo).toHaveBeenCalledWith('sbxexisting', options)
      expect(sdkMock.pause).toHaveBeenCalledWith('sbxexisting', options)
      const sandbox = await sdkMock.connect.mock.results.at(-1)?.value
      expect(sandbox.pty.kill).toHaveBeenCalledWith(42)
    })
  })

  it('prefers the explicit sandbox URL over the request host', async () => {
    process.env.PUBLIC_SANDBOX_URL = 'https://sandbox.internal.example'

    const c = await requestCaller()
    await c.killTerminalPty({ sandboxId: 'sbxexisting', pid: 42 })

    expect(sdkMock.connect).toHaveBeenCalledWith(
      'sbxexisting',
      expect.objectContaining({
        sandboxUrl: 'https://sandbox.internal.example',
      })
    )
  })

  it('passes no sandbox URL when only the domain is configured', async () => {
    delete process.env.E2B_INFRA_API_URL

    const c = await requestCaller()
    await c.killTerminalPty({ sandboxId: 'sbxexisting', pid: 42 })

    expect(sdkMock.connect).toHaveBeenCalledWith(
      'sbxexisting',
      expect.objectContaining({ sandboxUrl: undefined })
    )
  })

  it('passes no sandbox URL when the call carries no request host', async () => {
    const c = await caller()
    await c.resume({ sandboxId: 'sbxexisting' })

    expect(sdkMock.connect).toHaveBeenCalledWith(
      'sbxexisting',
      expect.objectContaining({ sandboxUrl: undefined })
    )
  })
})

describe('sandbox router public runtime settings', () => {
  it('uses the same public domain and sandbox URL for all SDK operations', async () => {
    process.env.PUBLIC_E2B_DOMAIN = 'runtime.example'
    process.env.PUBLIC_SANDBOX_URL = 'https://sandbox.runtime.example'
    delete process.env.E2B_INFRA_API_URL

    const c = await requestCaller()
    await c.openTerminal({ template: 'base' })
    await c.resume({ sandboxId: 'sbxexisting' })
    await c.pause({ sandboxId: 'sbxexisting' })
    await c.killTerminalPty({ sandboxId: 'sbxexisting', pid: 42 })

    const options = expect.objectContaining({
      domain: 'runtime.example',
      sandboxUrl: 'https://sandbox.runtime.example',
      apiUrl: 'https://api.runtime.example',
    })
    expect(sdkMock.create).toHaveBeenCalledWith('base', options)
    expect(sdkMock.connect).toHaveBeenCalledTimes(2)
    for (const call of sdkMock.connect.mock.calls) {
      expect(call).toEqual(['sbxexisting', options])
    }
    expect(sdkMock.getFullInfo).toHaveBeenCalledWith('sbxexisting', options)
    expect(sdkMock.pause).toHaveBeenCalledWith('sbxexisting', options)
  })
})
