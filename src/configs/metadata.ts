import type { Metadata } from 'next/types'

export const METADATA = {
  title: 'E2B - Code Interpreting for AI apps',
  description: 'Open-source secure sandboxes for AI code execution',
}

export function createMetadata(override: Metadata): Metadata {
  return {
    ...override,
  }
}
