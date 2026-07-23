import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTRPCContext } from '@/core/server/trpc/init'
import { SANDBOX_RESUME_TIMEOUT_MS } from '@/features/dashboard/sandbox/inspect/constants'
import { TERMINAL_SANDBOX_TIMEOUT_MS } from '@/features/dashboard/terminal/constants'

/**
 * Guards the lifecycle invariant for the sandbox debug/inspect views:
 *
 * - Connecting to a sandbox from the inspect/terminal CLIENT must never touch
 *   the control plane (`Sandbox.connect`/`Sandbox.create`), because those
 *   resume paused sandboxes and can extend a running sandbox's TTL.
 * - The only control-plane calls live in the tRPC router, and they happen on
 *   EXPLICIT user actions (open terminal / resume) with a deliberate,
 *   bounded `timeoutMs`.
 */

const sdkMock = vi.hoisted(() => ({
  connect: vi.fn(),
  create: vi.fn(),
  getFullInfo: vi.fn(),
}))

vi.mock('e2b', () => ({
  Sandbox: {
    connect: sdkMock.connect,
    create: sdkMock.create,
    getFullInfo: sdkMock.getFullInfo,
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

describe('sandbox lifecycle side effects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock.getApiKey.mockResolvedValue('e2b_test_api_key')
    sdkMock.connect.mockResolvedValue({ sandboxId: 'sbx_existing' })
    sdkMock.create.mockResolvedValue({ sandboxId: 'sbx_new' })
    sdkMock.getFullInfo.mockResolvedValue({
      sandboxDomain: 'sandbox.example.com',
      envdVersion: '0.2.0',
      envdAccessToken: 'envd-token',
    })
  })

  describe('sandbox.resume (explicit user action)', () => {
    it('resumes via the control plane with the bounded resume TTL only', async () => {
      const c = await caller()
      const result = await c.resume({
        sandboxId: 'sbxexisting',
      })

      // Resume is the only inspect-side control-plane connect, and it sets an
      // explicit, bounded TTL — never the SDK default.
      expect(sdkMock.connect).toHaveBeenCalledTimes(1)
      expect(sdkMock.connect).toHaveBeenCalledWith(
        'sbxexisting',
        expect.objectContaining({ timeoutMs: SANDBOX_RESUME_TIMEOUT_MS })
      )
      expect(sdkMock.create).not.toHaveBeenCalled()
      expect(result.envdAccessToken).toBe('envd-token')
    })
  })

  describe('sandbox.openTerminal (explicit user action)', () => {
    it('connects to an existing sandbox with the explicit terminal TTL', async () => {
      const c = await caller()
      await c.openTerminal({
        template: 'base',
        sandboxId: 'sbxexisting',
      })

      expect(sdkMock.connect).toHaveBeenCalledTimes(1)
      expect(sdkMock.connect).toHaveBeenCalledWith(
        'sbxexisting',
        expect.objectContaining({ timeoutMs: TERMINAL_SANDBOX_TIMEOUT_MS })
      )
      expect(sdkMock.create).not.toHaveBeenCalled()
    })

    it('creates a new sandbox (never connect) when no sandbox id is given', async () => {
      const c = await caller()
      await c.openTerminal({ template: 'base' })

      expect(sdkMock.create).toHaveBeenCalledTimes(1)
      expect(sdkMock.connect).not.toHaveBeenCalled()
    })
  })
})

describe('sandbox inspect/terminal client never calls the control plane', () => {
  const read = (relativePath: string) =>
    readFileSync(join(process.cwd(), relativePath), 'utf8')

  // Client modules that connect to sandboxes for the debug/inspect views.
  const clientModules = [
    'src/features/dashboard/sandbox/inspect/context.tsx',
    'src/features/dashboard/terminal/sandbox-session.ts',
    'src/features/dashboard/terminal/dashboard-terminal.tsx',
    'src/features/dashboard/sandbox/terminal/view.tsx',
  ]

  it.each(
    clientModules
  )('%s does not call Sandbox.connect / Sandbox.create', (modulePath) => {
    const source = read(modulePath)
    expect(source).not.toMatch(/Sandbox\.connect\s*\(/)
    expect(source).not.toMatch(/Sandbox\.create\s*\(/)
  })

  it('the inspect context builds an envd-only client via createEnvdSandbox', () => {
    const source = read('src/features/dashboard/sandbox/inspect/context.tsx')
    expect(source).toMatch(/createEnvdSandbox\(/)
  })

  it('createEnvdSandbox constructs envd-only and never calls the control plane', () => {
    const source = read('src/core/shared/create-envd-sandbox.ts')
    expect(source).not.toMatch(/Sandbox\.connect\s*\(/)
    expect(source).not.toMatch(/Sandbox\.create\s*\(/)
  })
})
