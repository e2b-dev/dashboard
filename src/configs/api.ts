export const API_KEY_PREFIX = 'e2b_'
export const API_KEY_HEADER = 'X-API-Key'

export function apiKeyHeaders(apiKey: string): Record<string, string> {
  return {
    [API_KEY_HEADER]: apiKey,
  }
}
