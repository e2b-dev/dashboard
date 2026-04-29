// Storybook stub: prevents server-only deps from being bundled.
// Real impl lives at src/core/server/actions/key-actions.ts.
// The mocked useAction in next-safe-action-hooks.tsx never invokes these.
export const createApiKeyAction = (() => {}) as unknown as never
export const deleteApiKeyAction = (() => {}) as unknown as never
export const updateApiKeyAction = (() => {}) as unknown as never
