import { beforeEach, describe, expect, it, vi } from 'vitest'
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
    it('round-trips session data and ignores invalid stored values', () => {
      writeStoredTerminalSession({
        sandboxId: 'sandbox-123',
        template: 'base',
      })

      expect(readStoredTerminalSession()).toEqual({
        sandboxId: 'sandbox-123',
        template: 'base',
      })

      window.localStorage.setItem(
        TERMINAL_SESSION_STORAGE_PREFIX,
        JSON.stringify({ template: 'base' })
      )
      expect(readStoredTerminalSession()).toBeNull()

      window.localStorage.setItem(
        TERMINAL_SESSION_STORAGE_PREFIX,
        JSON.stringify({ sandboxId: 123, template: 'base' })
      )
      expect(readStoredTerminalSession()).toBeNull()

      window.localStorage.setItem(
        TERMINAL_SESSION_STORAGE_PREFIX,
        JSON.stringify({ sandboxId: 'sandbox-123', template: 123 })
      )
      expect(readStoredTerminalSession()).toBeNull()

      window.localStorage.setItem(
        TERMINAL_SESSION_STORAGE_PREFIX,
        JSON.stringify({ sandboxId: 'sandbox-123', template: '../base' })
      )
      expect(readStoredTerminalSession()).toBeNull()

      clearStoredTerminalSession()
      expect(readStoredTerminalSession()).toBeNull()
    })

    it('treats storage writes and removals as best-effort', () => {
      vi.mocked(window.localStorage.setItem).mockImplementationOnce(() => {
        throw new Error('Quota exceeded')
      })
      vi.mocked(window.localStorage.removeItem).mockImplementationOnce(() => {
        throw new Error('Storage blocked')
      })

      expect(() =>
        writeStoredTerminalSession({
          sandboxId: 'sandbox-123',
          template: 'base',
        })
      ).not.toThrow()
      expect(() => clearStoredTerminalSession()).not.toThrow()
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
        rows: 23,
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
        rows: 21,
      })
    })

    it('uses xterm renderer dimensions for canvas renderers', () => {
      const container = {
        clientWidth: 900,
        clientHeight: 500,
        getBoundingClientRect: () => ({ width: 900, height: 500 }),
      } as HTMLDivElement
      const terminal = {
        _core: {
          _renderService: {
            dimensions: {
              css: {
                cell: { width: 8, height: 24 },
              },
            },
          },
        },
        element: {
          querySelector: (selector: string) => {
            if (selector === '.xterm-helper-textarea') {
              return {
                getBoundingClientRect: () => ({ width: 20, height: 24 }),
              }
            }
            return null
          },
        },
      } as never

      expect(calculateTerminalSize(container, terminal)).toEqual({
        cols: 104,
        rows: 19,
      })
    })

    it('does not use helper textarea width for columns', () => {
      const container = {
        clientWidth: 900,
        clientHeight: 500,
        getBoundingClientRect: () => ({ width: 900, height: 500 }),
      } as HTMLDivElement
      const terminal = {
        element: {
          querySelector: (selector: string) => {
            if (selector === '.xterm-helper-textarea') {
              return {
                getBoundingClientRect: () => ({ width: 20, height: 24 }),
              }
            }
            return null
          },
        },
      } as never

      expect(calculateTerminalSize(container, terminal)).toEqual({
        cols: 104,
        rows: 19,
      })
    })
  })

  describe('openTerminalSandbox', () => {
    it('connects to an explicit sandbox without writing a stored session', async () => {
      const statuses: string[] = []

      await openTerminalSandbox({
        onStatus: (message) => statuses.push(message),
        openTerminal: mockOpenTerminal,
        sandboxId: 'sandbox-from-url',
        template: 'base',
      })

      expect(mockOpenTerminal).toHaveBeenCalledWith({
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
      expect(readStoredTerminalSession()).toBeNull()
      expect(statuses).toEqual([
        'Connecting to terminal sandbox sandbox-from-url...\r\n',
      ])
    })

    it('connects to a tokenless (secure: false) sandbox without an envd access token', async () => {
      mockOpenTerminal.mockResolvedValueOnce({
        sandboxId: 'insecure-sandbox',
        sandboxDomain: 'sandbox.example.com',
        envdVersion: '0.2.0',
        envdAccessToken: undefined,
      })

      await openTerminalSandbox({
        onStatus: vi.fn(),
        openTerminal: mockOpenTerminal,
        sandboxId: 'insecure-sandbox',
        template: 'base',
      })

      expect(mockCreateEnvdSandbox).toHaveBeenCalledWith({
        sandboxId: 'insecure-sandbox',
        sandboxDomain: 'sandbox.example.com',
        envdVersion: '0.2.0',
        envdAccessToken: undefined,
        domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
        sandboxUrl: process.env.NEXT_PUBLIC_E2B_SANDBOX_URL,
      })
    })

    it('creates and stores a terminal sandbox when no reusable session exists', async () => {
      await openTerminalSandbox({
        onStatus: vi.fn(),
        openTerminal: mockOpenTerminal,
        template: 'base',
      })

      expect(mockOpenTerminal).toHaveBeenCalledWith({
        template: 'base',
      })
      expect(readStoredTerminalSession()).toEqual({
        sandboxId: 'created-sandbox',
        template: 'base',
      })
    })

    it('reuses a stored sandbox only when its template matches', async () => {
      writeStoredTerminalSession({
        sandboxId: 'stored-sandbox',
        template: 'base',
      })

      await openTerminalSandbox({
        onStatus: vi.fn(),
        openTerminal: mockOpenTerminal,
        template: 'base',
      })

      expect(mockOpenTerminal).toHaveBeenCalledWith({
        template: 'base',
        sandboxId: 'stored-sandbox',
        requestTimeoutMs: undefined,
      })
    })

    it('creates a new sandbox when reuse is disabled for a matching stored template', async () => {
      writeStoredTerminalSession({
        sandboxId: 'stored-sandbox',
        template: 'base',
      })

      await openTerminalSandbox({
        forceNewSandbox: true,
        onStatus: vi.fn(),
        openTerminal: mockOpenTerminal,
        template: 'base',
      })

      expect(mockOpenTerminal).toHaveBeenCalledWith({
        template: 'base',
      })
      expect(readStoredTerminalSession()).toEqual({
        sandboxId: 'created-sandbox',
        template: 'base',
      })
    })

    it('falls back to creating a new sandbox when reconnecting fails', async () => {
      writeStoredTerminalSession({
        sandboxId: 'stored-sandbox',
        template: 'base',
      })

      mockOpenTerminal.mockImplementationOnce(async () => {
        throw new Error('Failed to connect to terminal sandbox')
      })

      await openTerminalSandbox({
        onStatus: vi.fn(),
        openTerminal: mockOpenTerminal,
        template: 'base',
      })

      // First call attempts the stored sandbox, second call creates a new one.
      expect(mockOpenTerminal).toHaveBeenNthCalledWith(1, {
        template: 'base',
        sandboxId: 'stored-sandbox',
        requestTimeoutMs: undefined,
      })
      expect(mockOpenTerminal).toHaveBeenNthCalledWith(2, {
        template: 'base',
      })
      expect(readStoredTerminalSession()).toEqual({
        sandboxId: 'created-sandbox',
        template: 'base',
      })
    })
  })
})
