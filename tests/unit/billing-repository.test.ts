import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBillingRepository } from '@/core/modules/billing/repository.server'

const scope = {
  accessToken: 'access-token',
  teamId: 'team-id',
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

function createRepository() {
  return createBillingRepository(scope, {
    billingApiUrl: 'https://billing.test',
  })
}

describe('createBillingRepository', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates customer sessions through the payment methods session endpoint', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ client_secret: 'cs_test' }))
    vi.stubGlobal('fetch', fetch)

    const result = await createRepository().getCustomerSession()

    expect(result).toEqual({
      ok: true,
      data: { client_secret: 'cs_test' },
    })
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.test/teams/team-id/payment-methods-session',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Supabase-Token': 'access-token',
          'X-Supabase-Team': 'team-id',
        }),
      })
    )
  })

  it('requests setup intent details for blocked-team payment recovery', async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        client_secret: 'customer_session_secret',
        setup_intent_client_secret: 'setup_intent_secret',
      })
    )
    vi.stubGlobal('fetch', fetch)

    const result = await createRepository().createPaymentMethodsSession()

    expect(result).toEqual({
      ok: true,
      data: {
        client_secret: 'customer_session_secret',
        setup_intent_client_secret: 'setup_intent_secret',
      },
    })
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.test/teams/team-id/payment-methods-session?include_setup_intent=true',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('rejects payment recovery sessions without a setup intent secret', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ client_secret: 'customer_secret' }))
    )

    const result = await createRepository().createPaymentMethodsSession()

    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: 'unavailable',
        status: 500,
        message: 'Invalid payment methods session response',
      }),
    })
  })

  it('creates verification payments for verification-blocked teams', async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        client_secret: 'payment_intent_secret',
        amount_due_cents: 100,
      })
    )
    vi.stubGlobal('fetch', fetch)

    const result = await createRepository().createVerificationPayment()

    expect(result).toEqual({
      ok: true,
      data: {
        client_secret: 'payment_intent_secret',
        amount_due_cents: 100,
      },
    })
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.test/teams/team-id/verification-payment',
      expect.objectContaining({ method: 'POST' })
    )
  })
})
