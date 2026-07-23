'use client'

// OSS: analytics removed; no-op kept so call sites stay identical to console.
export const trackSandboxListInteraction = (
  _action: string,
  _properties: Record<string, unknown> = {}
) => {}
