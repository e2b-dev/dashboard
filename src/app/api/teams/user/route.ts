import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { TeamWithDefault } from '@/types/dashboard'
import { createRouteClient } from '@/lib/clients/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: usersTeamsData, error } = await supabaseAdmin
      .from('users_teams')
      .select('*, teams (*)')
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!usersTeamsData || usersTeamsData.length === 0) {
      return NextResponse.json({ error: 'No teams found' }, { status: 404 })
    }

    const teams: TeamWithDefault[] = usersTeamsData.map((userTeam) => {
      const team = userTeam.teams
      return { ...team, is_default: userTeam.is_default }
    })

    return NextResponse.json(teams)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch user teams' },
      { status: 500 }
    )
  }
}
