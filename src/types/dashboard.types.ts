import { Database } from './database.types'

export type ClientTeam = Database['public']['Tables']['teams']['Row'] & {
  is_default?: boolean
  // provides a transformed name for teams that are default ones and have "unchanged" default names
  // e.g. "max.mustermann@gmail.com" -> "Max.mustermann's Team"
  transformed_default_name?: string
}

export type PollingInterval = 0 | 15 | 30 | 60 // seconds
