import { beforeEach, describe, expect, it, vi } from 'vitest'
import { attachTerminalWithRetry } from '@/features/dashboard/terminal/attach-terminal'
import { TERMINAL_SESSION_STORAGE_PREFIX } from '@/features/dashboard/terminal/constants'
import { openTerminalSandbox } from '@/features/dashboard/terminal/sandbox-session'
import {
  clearStoredTerminalSession,
  readStoredTerminalSession,
  writeStoredTerminalSession,
} from '@/features/dashboard/terminal/storage'
import {
  normalizeTerminalTemplate,
  resolveTerminalTemplateOverride,
} from '@/features/dashboard/terminal/template'
import { calculateTerminalSize } from '@/features/dashboard/terminal/terminal-size'

const { mockCreateEnvdSandbox } = vi.hoisted(() => ({
  mockCreateEnvdSandbox: vi.fn(),
}))

vi.mock('@/core/shared/create-envd-sandbox', () => ({
  createEnvdSandbox: mockCreateEnvdSandbox,
}))

// The `sandbox.openTerminal` tRPC mutation is injected into
// openTerminalSandbox, so the test passes this mock directly instead of
// mocking a module.
const mockOpenTerminal = vi.fn()

function installLocalStorage() {
  const values = new Map<string, string>()

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      innerWidth: 1200,
      localStorage: {
        getItem: vi.fn((key: string) => values.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
          values.set(key, value)
        }),
        removeItem: vi.fn((key: string) => {
          values.delete(key)
        }),
      },
    },
  })

  return values
}

describe('dashboard terminal helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    installLocalStorage()
    // The tRPC mutation returns sandbox-scoped envd credentials; for an
    // explicit/stored sandbox id it echoes that id back, otherwise it reports
    // the freshly created sandbox id.
    mockOpenTerminal.mockImplementation(
      async (input: { sandboxId?: string }) => ({
        sandboxId: input.sandboxId ?? 'created-sandbox',
        sandboxDomain: 'sandbox.example.com',
        envdVersion: '0.2.0',
        envdAccessToken: 'envd-token',
      })
    )
    mockCreateEnvdSandbox.mockImplementation(
      (params: { sandboxId: string }) => ({ sandboxId: params.sandboxId })
    )
  })

  describe('normalizeTerminalTemplate', () => {
    it('defaults blank values to base', () => {
      expect(normalizeTerminalTemplate()).toBe('base')
      expect(normalizeTerminalTemplate('  ')).toBe('base')
    })

    it('keeps valid template identifiers and rejects unsafe values', () => {
      expect(normalizeTerminalTemplate(' python_3.12-dev ')).toBe(
        'python_3.12-dev'
      )
      expect(normalizeTerminalTemplate('team-slug/python:default')).toBe(
        'team-slug/python:default'
      )
      expect(normalizeTerminalTemplate('base; echo nope')).toBeNull()
      expect(normalizeTerminalTemplate('../base')).toBeNull()
    })
  })

  describe('resolveTerminalTemplateOverride', () => {
    it('preserves the current template when no override is provided', () => {
      expect(resolveTerminalTemplateOverride(undefined, 'python')).toBe(
        'python'
      )
    })

    it('normalizes explicit overrides', () => {
      expect(resolveTerminalTemplateOverride('  ', 'python')).toBe('base')
      expect(resolveTerminalTemplateOverride('../base', 'python')).toBeNull()
    })
  })

  describe('stored terminal session', () => {
    it('round-trips session data by user and ignores invalid stored values', () => {
      writeStoredTerminalSession('user-123', {
        sandboxId: 'sandbox-123',
        template: 'base',
      })

      expect(readStoredTerminalSession('user-123')).toEqual({
        sandboxId: 'sandbox-123',
        template: 'base',
      })
      expect(readStoredTerminalSession('user-456')).toBeNull()

      window.localStorage.setItem(
        `${TERMINAL_SESSION_STORAGE_PREFIX}:user-123`,
        JSON.stringify({ template: 'base' })
      )
      expect(readStoredTerminalSession('user-123')).toBeNull()

      window.localStorage.setItem(
        `${TERMINAL_SESSION_STORAGE_PREFIX}:user-123`,
        JSON.stringify({ sandboxId: 123, template: 'base' })
      )
      expect(readStoredTerminalSession('user-123')).toBeNull()

      window.localStorage.setItem(
        `${TERMINAL_SESSION_STORAGE_PREFIX}:user-123`,
        JSON.stringify({ sandboxId: 'sandbox-123', template: 123 })
      )
      expect(readStoredTerminalSession('user-123')).toBeNull()

      window.localStorage.setItem(
        `${TERMINAL_SESSION_STORAGE_PREFIX}:user-123`,
        JSON.stringify({ sandboxId: 'sandbox-123', template: '../base' })
      )
      expect(readStoredTerminalSession('user-123')).toBeNull()

      clearStoredTerminalSession('user-123')
      expect(readStoredTerminalSession('user-123')).toBeNull()
    })

    it('treats storage writes and removals as best-effort', () => {
      vi.mocked(window.localStorage.setItem).mockImplementationOnce(() => {
        throw new Error('Quota exceeded')
      })
      vi.mocked(window.localStorage.removeItem).mockImplementationOnce(() => {
        throw new Error('Storage blocked')
      })

      expect(() =>
        writeStoredTerminalSession('user-123', {
          sandboxId: 'sandbox-123',
          template: 'base',
        })
      ).not.toThrow()
      expect(() => clearStoredTerminalSession('user-123')).not.toThrow()
    })
  })

  describe('calculateTerminalSize', () => {
    it('uses fallback dimensions without a rendered terminal', () => {
      const container = {
        clientWidth: 900,
        clientHeight: 500,
        getBoundingClientRect: () => ({ width: 900, height: 500 }),
      } as HTMLDivElement

      expect(calculateTerminalSize(container, null)).toEqual({
        cols: 104,
        rows: 22,
      })
    })

    it('honors measured xterm cell dimensions when available', () => {
      const container = {
        clientWidth: 900,
        clientHeight: 500,
        getBoundingClientRect: () => ({ width: 900, height: 500 }),
      } as HTMLDivElement
      const terminal = {
        element: {
          querySelector: (selector: string) => {
            if (selector === '.xterm-char-measure-element') {
              return {
                getBoundingClientRect: () => ({ width: 10, height: 18 }),
              }
            }
            if (selector === '.xterm-rows > div') {
              return {
                getBoundingClientRect: () => ({ width: 900, height: 22 }),
              }
            }
            return null
          },
        },
      } as never

      expect(calculateTerminalSize(container, terminal)).toEqual({
        cols: 83,
        rows: 20,
      })
    })
  })

  describe('attachTerminalWithRetry', () => {
    const retryOptions = {
      maxRetries: 2,
      retryBaseDelayMs: 100,
      retryMaxDelayMs: 500,
    }

    it('returns the first successful attach without retrying', async () => {
      const attachResult = { pty: 'pty', sandbox: 'sandbox' }
      const waitForRetry = vi.fn()
      const onRetry = vi.fn()

      await expect(
        attachTerminalWithRetry({
          canRetry: true,
          isCurrent: () => true,
          isRetryableError: () => true,
          ...retryOptions,
          onRetry,
          open: vi.fn().mockResolvedValue(attachResult),
          waitForRetry,
        })
      ).resolves.toBe(attachResult)

      expect(onRetry).not.toHaveBeenCalled()
      expect(waitForRetry).not.toHaveBeenCalled()
    })

    it('retries retryable attach failures with exponential backoff', async () => {
      const attachResult = { pty: 'pty', sandbox: 'sandbox' }
      const retryableError = new Error('timeout')
      const open = vi
        .fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce(attachResult)
      const waitForRetry = vi.fn().mockResolvedValue(undefined)
      const onRetry = vi.fn()

      await expect(
        attachTerminalWithRetry({
          canRetry: true,
          isCurrent: () => true,
          isRetryableError: (error) => error === retryableError,
          ...retryOptions,
          onRetry,
          open,
          waitForRetry,
        })
      ).resolves.toBe(attachResult)

      expect(open).toHaveBeenCalledTimes(3)
      expect(onRetry).toHaveBeenNthCalledWith(1, 100)
      expect(onRetry).toHaveBeenNthCalledWith(2, 200)
      expect(waitForRetry).toHaveBeenNthCalledWith(1, 100)
      expect(waitForRetry).toHaveBeenNthCalledWith(2, 200)
    })

    it('caps exponential backoff at the configured max delay', async () => {
      const attachResult = { pty: 'pty', sandbox: 'sandbox' }
      const retryableError = new Error('timeout')
      const open = vi
        .fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce(attachResult)
      const waitForRetry = vi.fn().mockResolvedValue(undefined)
      const onRetry = vi.fn()

      await expect(
        attachTerminalWithRetry({
          canRetry: true,
          isCurrent: () => true,
          isRetryableError: (error) => error === retryableError,
          maxRetries: 3,
          onRetry,
          open,
          retryBaseDelayMs: 100,
          retryMaxDelayMs: 150,
          waitForRetry,
        })
      ).resolves.toBe(attachResult)

      expect(open).toHaveBeenCalledTimes(4)
      expect(onRetry).toHaveBeenNthCalledWith(1, 100)
      expect(onRetry).toHaveBeenNthCalledWith(2, 150)
      expect(onRetry).toHaveBeenNthCalledWith(3, 150)
      expect(waitForRetry).toHaveBeenNthCalledWith(1, 100)
      expect(waitForRetry).toHaveBeenNthCalledWith(2, 150)
      expect(waitForRetry).toHaveBeenNthCalledWith(3, 150)
    })

    it('does not retry non-retryable attach failures', async () => {
      const error = new Error('permission denied')
      const waitForRetry = vi.fn()

      await expect(
        attachTerminalWithRetry({
          canRetry: true,
          isCurrent: () => true,
          isRetryableError: () => false,
          ...retryOptions,
          onRetry: vi.fn(),
          open: vi.fn().mockRejectedValue(error),
          waitForRetry,
        })
      ).rejects.toBe(error)

      expect(waitForRetry).not.toHaveBeenCalled()
    })

    it('stops retrying when the caller is no longer current', async () => {
      let isCurrent = true
      const open = vi.fn().mockRejectedValue(new Error('timeout'))
      const waitForRetry = vi.fn().mockImplementation(async () => {
        isCurrent = false
      })

      await expect(
        attachTerminalWithRetry({
          canRetry: true,
          isCurrent: () => isCurrent,
          isRetryableError: () => true,
          ...retryOptions,
          onRetry: vi.fn(),
          open,
          waitForRetry,
        })
      ).resolves.toBeNull()

      expect(open).toHaveBeenCalledTimes(1)
      expect(waitForRetry).toHaveBeenCalledWith(100)
    })
  })

  describe('openTerminalSandbox', () => {
    it('connects to an explicit sandbox without writing a stored session', async () => {
      const statuses: string[] = []

      await openTerminalSandbox({
        onStatus: (message) => statuses.push(message),
        openTerminal: mockOpenTerminal,
        teamSlug: 'team-slug',
        userId: 'user-123',
        sandboxId: 'sandbox-from-url',
        template: 'base',
      })

      expect(mockOpenTerminal).toHaveBeenCalledWith({
        teamSlug: 'team-slug',
        template: 'base',
        sandboxId: 'sandbox-from-url',
        requestTimeoutMs: undefined,
      })
      expect(mockCreateEnvdSandbox).toHaveBeenCalledWith({
        sandboxId: 'sandbox-from-url',
        sandboxDomain: 'sandbox.example.com',
        envdVersion: '0.2.0',
        envdAccessToken: 'envd-token',
        domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
        sandboxUrl: process.env.NEXT_PUBLIC_E2B_SANDBOX_URL,
      })
      expect(readStoredTerminalSession('user-123')).toBeNull()
      expect(statuses).toEqual([
        'Connecting to terminal sandbox sandbox-from-url...\r\n',
      ])
    })

    it('creates and stores a terminal sandbox when no reusable session exists', async () => {
      await openTerminalSandbox({
        onStatus: vi.fn(),
        openTerminal: mockOpenTerminal,
        teamSlug: 'team-slug',
        userId: 'user-123',
        template: 'base',
      })

      expect(mockOpenTerminal).toHaveBeenCalledWith({
        teamSlug: 'team-slug',
        template: 'base',
      })
      expect(readStoredTerminalSession('user-123')).toEqual({
        sandboxId: 'created-sandbox',
        template: 'base',
      })
    })

    it('reuses a stored sandbox only when its template matches', async () => {
      writeStoredTerminalSession('user-123', {
        sandboxId: 'stored-sandbox',
        template: 'base',
      })

      await openTerminalSandbox({
        onStatus: vi.fn(),
        openTerminal: mockOpenTerminal,
        teamSlug: 'team-slug',
        userId: 'user-123',
        template: 'base',
      })

      expect(mockOpenTerminal).toHaveBeenCalledWith({
        teamSlug: 'team-slug',
        template: 'base',
        sandboxId: 'stored-sandbox',
        requestTimeoutMs: undefined,
      })
    })

    it('falls back to creating a new sandbox when reconnecting fails', async () => {
      writeStoredTerminalSession('user-123', {
        sandboxId: 'stored-sandbox',
        template: 'base',
      })

      mockOpenTerminal.mockImplementationOnce(async () => {
        throw new Error('Failed to connect to terminal sandbox')
      })

      await openTerminalSandbox({
        onStatus: vi.fn(),
        openTerminal: mockOpenTerminal,
        teamSlug: 'team-slug',
        userId: 'user-123',
        template: 'base',
      })

      // First call attempts the stored sandbox, second call creates a new one.
      expect(mockOpenTerminal).toHaveBeenNthCalledWith(1, {
        teamSlug: 'team-slug',
        template: 'base',
        sandboxId: 'stored-sandbox',
        requestTimeoutMs: undefined,
      })
      expect(mockOpenTerminal).toHaveBeenNthCalledWith(2, {
        teamSlug: 'team-slug',
        template: 'base',
      })
      expect(readStoredTerminalSession('user-123')).toEqual({
        sandboxId: 'created-sandbox',
        template: 'base',
      })
    })
  })
})
