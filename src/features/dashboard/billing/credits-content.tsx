import { getUsageThroughReactCache } from '@/server/usage/get-usage'

export default async function BillingCreditsContent({
  teamId,
}: {
  teamId: string
}) {
  const res = await getUsageThroughReactCache({
    teamId,
  })

  if (!res?.data || res.serverError) {
    throw new Error(res?.serverError || 'Failed to load credits')
  }

  const usage = res.data

  return (
    <span className="ml-2 text-2xl font-bold">
      <span className="text-accent text-sm font-normal">$ </span>
      {usage.credits.toLocaleString(undefined, {
        maximumFractionDigits: 2,
        useGrouping: true,
      })}
    </span>
  )
}
