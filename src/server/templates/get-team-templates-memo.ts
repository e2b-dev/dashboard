import { cache } from 'react'
import { getTeamTemplatesPure } from './get-team-templates-pure'

export default cache(getTeamTemplatesPure)
