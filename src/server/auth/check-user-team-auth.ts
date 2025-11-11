import { cache } from 'react'
import checkUserTeamAuthorizationPure from './check-user-team-auth-pure'

export default cache(checkUserTeamAuthorizationPure)
