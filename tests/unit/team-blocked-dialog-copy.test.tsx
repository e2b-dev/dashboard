// @vitest-environment jsdom

// Targeted render coverage for the blocked-project dialog copy: the blocked
// flow cannot be triggered in the E2E environment, and this is the
// highest-stakes copy of the rename.

import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('posthog-js/react', () => ({
  usePostHog: () => ({ capture: vi.fn() }),
}))

vi.mock('nuqs', () => ({
  parseAsString: {},
  useQueryStates: () => [
    {
      payment_intent: null,
      payment_intent_client_secret: null,
      setup_intent: null,
      setup_intent_client_secret: null,
      redirect_status: null,
    },
    vi.fn(),
  ],
}))

vi.mock('usehooks-ts', () => ({
  useSessionStorage: () => [false, vi.fn(), vi.fn()],
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: { mutationFn?: () => Promise<unknown> }) => ({
    mutateAsync: options?.mutationFn ?? (async () => ({})),
    isPending: false,
  }),
}))

vi.mock('@/trpc/client', () => ({
  useTRPC: () => ({
    billing: {
      createVerificationPayment: {
        mutationOptions: () => ({
          mutationFn: async () => ({
            client_secret: 'cs_test',
            amount_due_cents: 1000,
          }),
        }),
      },
      createPaymentMethodsSession: {
        mutationOptions: () => ({
          mutationFn: async () => ({
            client_secret: 'cs_test',
            setup_intent_client_secret: 'seti_test',
          }),
        }),
      },
    },
  }),
}))

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
  defaultErrorToast: (message: string) => ({ description: message }),
}))

vi.mock('@/features/dashboard/context', () => ({
  useDashboard: () => ({
    team: { slug: 'acme', blockedReason: null, isBlocked: true },
  }),
}))

vi.mock('@/features/dashboard/team-blocked/team-blocked-recovery', async () => {
  const { useEffect: useEffectHook } = await import('react')
  return {
    LoadingState: ({ message }: { message: string }) => <div>{message}</div>,
    // Immediately create the payment session so the dialog reaches the
    // state where the warning alert copy renders.
    useStripeReturnHandler: ({
      createPaymentSession,
    }: {
      createPaymentSession: () => Promise<void>
    }) => {
      useEffectHook(() => {
        void createPaymentSession()
      }, [createPaymentSession])
    },
    useTeamUnblockPolling: () => async () => true,
    TeamBlockedRecoveryPaymentElement: ({ alert }: { alert: ReactNode }) => (
      <div>{alert}</div>
    ),
  }
})

import { MissingPaymentMethodDialog } from '@/features/dashboard/team-blocked/missing-payment-method-dialog'
import { VerificationRequiredDialog } from '@/features/dashboard/team-blocked/verification-required-dialog'

afterEach(() => {
  cleanup()
})

describe('blocked-project dialog copy', () => {
  it('verification dialog speaks about projects', async () => {
    render(
      <VerificationRequiredDialog
        open
        onOpenChange={vi.fn()}
        onDismiss={vi.fn()}
      />
    )

    expect(await screen.findByText('Verify project')).toBeTruthy()
    expect(
      screen.getByText(
        /This project is blocked because verification is required/
      )
    ).toBeTruthy()
    expect(
      await screen.findByText(/added back to your project as credits/)
    ).toBeTruthy()
    expect(screen.queryByText(/team/i)).toBeNull()
  })

  it('missing-payment dialog speaks about projects', async () => {
    render(
      <MissingPaymentMethodDialog
        open
        onOpenChange={vi.fn()}
        onDismiss={vi.fn()}
      />
    )

    expect(
      await screen.findByText(
        /This project is blocked because there is no payment method on file/
      )
    ).toBeTruthy()
    expect(
      await screen.findByText(
        /payment method will be saved to your project billing account/
      )
    ).toBeTruthy()
    expect(screen.queryByText(/team/i)).toBeNull()
  })
})
