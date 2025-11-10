import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

/**
 * For backward compatibility - redirects to the default tab (monitoring)
 */
export const GET = async (
  _req: NextRequest,
  ctx: RouteContext<'/dashboard/[teamIdOrSlug]/sandboxes'>
) => {
  const { teamIdOrSlug } = await ctx.params

  redirect(`/dashboard/${teamIdOrSlug}/sandboxes/monitoring`)
}
