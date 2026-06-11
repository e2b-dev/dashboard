// Backend contract for secrets isn't merged yet. This type is a forward-looking
// placeholder shaped after the Figma table columns; swap for the generated
// `components['schemas']['SecretDetail']` once the API ships.
export interface SecretAuthor {
  email: string | null
  avatarUrl: string | null
}

export interface Secret {
  id: string
  label: string
  description?: string
  allowList: { mode: 'all' } | { mode: 'specific'; hosts: string[] }
  createdAt: string
  createdBy?: SecretAuthor
}
