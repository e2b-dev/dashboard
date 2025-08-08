import { getUsageThroughReactCache } from '@/server/usage/get-usage'
import ErrorTooltip from '@/ui/error-tooltip'
import { AlertTriangle } from 'lucide-react'

export default async function BillingCreditsContent({
  teamId,
}: {
  teamId: string
}) {
  const res = await getUsageThroughReactCache({
    teamId,
  })
  if (!res?.data || res.serverError) {
    return (
      <ErrorTooltip
        trigger={
          <span className="ml-2 inline-flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-accent-error-highlight" />
            <span className="prose-body-highlight text-accent-error-highlight">
              Failed to load credits
            </span>
          </span>
        }
      >
        {res?.serverError || 'Failed to load credits'}
      </ErrorTooltip>
    )
  }

  const usage = res.data

  return (
    <span className="ml-2 prose-value-big">
      <span className="text-accent-main-highlight prose-value-small mr-0.5">
        ${' '}
      </span>
      {usage.credits.toLocaleString(undefined, {
        maximumFractionDigits: 2,
        useGrouping: true,
      })}
    </span>
  )
}
