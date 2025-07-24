import { Database } from '@/types/database.types'
import { ReactNode } from 'react'

// NOTE: local object of public tiers present in the database
// TODO: add is_public to tiers table and fetch only public tiers instead of hardcoding
export type Tier = Database['public']['Tables']['tiers']['Row'] & {
  prose: ReactNode[]
}

export const TIERS: Tier[] = [
  {
    id: 'base_v1',
    name: 'Hobby',
    concurrent_instances: 20,
    disk_mb: 1024,
    max_length_hours: 1,
    prose: [
      'One-time $100 of usage in credits',
      'Community support',
      'Up to 1 hour sandbox session length',
      'Up to 20 concurrently running sandboxes',
    ],
  },
  {
    id: 'pro_v1',
    name: 'Pro',
    concurrent_instances: 100,
    disk_mb: 5120,
    max_length_hours: 24,
    prose: [
      'One-time $100 of usage in credits',
      'Customize your Sandbox CPU & RAM',
      'Up to 24 hours sandbox session length',
      'Up to 100 concurrently running sandboxes',
    ],
  },
]
