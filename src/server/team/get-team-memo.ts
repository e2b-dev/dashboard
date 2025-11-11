import { cache } from 'react'
import { getTeamPure } from './get-team-pure'

export default cache(getTeamPure)
