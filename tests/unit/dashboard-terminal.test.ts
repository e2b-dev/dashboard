import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AUTHORIZATION_HEADER,
  BEARER_TOKEN_PREFIX,
  TEAM_ID_HEADER,
} from '@/configs/api'
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
import { sanitizeTerminalPaste } from '@/features/dashboard/terminal/terminal-paste'
import { calculateTerminalSize } from '@/features/dashboard/terminal/terminal-size'

const { mockCreateSandbox, mockConnectSandbox } = vi.hoisted(() => ({
  mockCreateSandbox: vi.fn(),
  mockConnectSandbox: vi.fn(),
}))

vi.mock('e2b', () => ({
  default: {
    connect: mockConnectSandbox,
    create: mockCreateSandbox,
  },
}))

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
  const sandboxManagementAuth = {
    headers: {
      [AUTHORIZATION_HEADER]: `${BEARER_TOKEN_PREFIX}auth-provider-token`,
      [TEAM_ID_HEADER]: 'team-123',
    },
    userId: 'user-123',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    installLocalStorage()
    mockCreateSandbox.mockResolvedValue({ sandboxId: 'created-sandbox' })
    mockConnectSandbox.mockResolvedValue({ sandboxId: 'connected-sandbox' })
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

    it('uses terminal dimensions after the emulator has fit itself', () => {
      const container = {
        clientWidth: 900,
        clientHeight: 500,
        getBoundingClientRect: () => ({ width: 900, height: 500 }),
      } as HTMLDivElement
      const terminal = {
        cols: 120,
        rows: 32,
      }

      expect(calculateTerminalSize(container, terminal)).toEqual({
        cols: 120,
        rows: 32,
      })
    })

    it('does not inflate fitted terminal dimensions to fallback minimums', () => {
      const container = {
        clientWidth: 200,
        clientHeight: 120,
        getBoundingClientRect: () => ({ width: 200, height: 120 }),
      } as HTMLDivElement
      const terminal = {
        cols: 20,
        rows: 6,
      }

      expect(calculateTerminalSize(container, terminal)).toEqual({
        cols: 20,
        rows: 6,
      })
    })
  })

  describe('sanitizeTerminalPaste', () => {
    it('preserves printable shell input and common whitespace', () => {
      expect(sanitizeTerminalPaste('echo hello\tworld\npwd\r\n')).toBe(
        'echo hello\tworld\npwd\r\n'
      )
    })

    it('strips escape sequences and non-whitespace control characters', () => {
      expect(
        sanitizeTerminalPaste(
          '\x1b[200~echo nope\x1b[201~\x1b]0;title\x07\x9b31m\x00\x7f'
        )
      ).toBe('echo nope')
    })
  })

  describe('openTerminalSandbox', () => {
    it('connects to an explicit sandbox without writing a stored session', async () => {
      const statuses: string[] = []

      await openTerminalSandbox({
        onStatus: (message) => statuses.push(message),
        sandboxManagementAuth,
        sandboxId: 'sandbox-from-url',
        template: 'base',
      })

      expect(mockConnectSandbox).toHaveBeenCalledWith('sandbox-from-url', {
        domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
        timeoutMs: 30 * 60 * 1000,
        requestTimeoutMs: undefined,
        headers: {
          [AUTHORIZATION_HEADER]: `${BEARER_TOKEN_PREFIX}auth-provider-token`,
          [TEAM_ID_HEADER]: 'team-123',
        },
      })
      expect(mockCreateSandbox).not.toHaveBeenCalled()
      expect(readStoredTerminalSession('user-123')).toBeNull()
      expect(statuses).toEqual([
        'Connecting to terminal sandbox sandbox-from-url...\r\n',
      ])
    })

    it('creates and stores a terminal sandbox when no reusable session exists', async () => {
      await openTerminalSandbox({
        onStatus: vi.fn(),
        sandboxManagementAuth,
        template: 'base',
      })

      expect(mockCreateSandbox).toHaveBeenCalledWith('base', {
        domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
        timeoutMs: 30 * 60 * 1000,
        lifecycle: {
          onTimeout: 'pause',
          autoResume: true,
        },
        metadata: {
          source: 'dashboard-terminal',
          template: 'base',
          userId: 'user-123',
        },
        headers: {
          [AUTHORIZATION_HEADER]: `${BEARER_TOKEN_PREFIX}auth-provider-token`,
          [TEAM_ID_HEADER]: 'team-123',
        },
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
        sandboxManagementAuth,
        template: 'base',
      })

      expect(mockConnectSandbox).toHaveBeenCalledWith(
        'stored-sandbox',
        expect.anything()
      )
      expect(mockCreateSandbox).not.toHaveBeenCalled()
    })
  })
})
