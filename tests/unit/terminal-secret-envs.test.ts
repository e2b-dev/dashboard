import { afterEach, describe, expect, it } from 'vitest'
import { getTerminalSecretEnvs } from '@/features/dashboard/terminal/secret-envs.server'

const ORIGINAL_ENV = process.env

describe('getTerminalSecretEnvs', () => {
  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it('does not expose default terminal env vars', () => {
    process.env = {
      ...ORIGINAL_ENV,
      OPENAI_API_KEY: 'openai-value',
      ANTHROPIC_API_KEY: 'anthropic-value',
    }

    expect(getTerminalSecretEnvs('base')).toEqual({})
  })

  it('loads configured terminal env vars when present', () => {
    process.env = {
      ...ORIGINAL_ENV,
      DASHBOARD_TERMINAL_SECRET_ENVS: 'OPENAI_API_KEY',
      OPENAI_API_KEY: 'openai-value',
      STRIPE_SECRET_KEY: 'stripe-value',
    }

    expect(getTerminalSecretEnvs('base')).toEqual({
      OPENAI_API_KEY: 'openai-value',
    })
  })

  it('allows a template-specific local allowlist override', () => {
    process.env = {
      ...ORIGINAL_ENV,
      DASHBOARD_TERMINAL_SECRET_ENVS_PYTHON_3_12: 'CUSTOM_SECRET',
      CUSTOM_SECRET: 'custom-value',
      OPENAI_API_KEY: 'openai-value',
    }

    expect(getTerminalSecretEnvs('python-3.12')).toEqual({
      CUSTOM_SECRET: 'custom-value',
    })
  })
})
