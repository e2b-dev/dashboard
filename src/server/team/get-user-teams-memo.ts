import 'server-cli-only'

import type { User } from '@supabase/supabase-js'
import { cache } from 'react'

import { getUserTeams } from './get-user-teams'

const getUserTeamsMemo = cache((user: User) => getUserTeams(user))

export default getUserTeamsMemo
