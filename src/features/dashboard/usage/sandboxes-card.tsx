import { getUsageThroughReactCache } from '@/server/usage/get-usage'
import { ChartPlaceholder } from '@/ui/chart-placeholder'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import { Suspense } from 'react'
import { SandboxesChart } from './sandboxes-chart'

export function SandboxesCard({
  className,
  teamId,
}: {
  className?: string
  teamId: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="font-mono">Sandboxes Usage</CardTitle>
        <CardDescription>
          Total sandboxes started and resumed over time.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Suspense
          fallback={
            <ChartPlaceholder
              key="chart-placeholder-sandboxes"
              isLoading={true}
              classNames={{ container: 'h-60' }}
            />
          }
        >
          <SandboxesStartedContent teamId={teamId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}

async function SandboxesStartedContent({ teamId }: { teamId: string }) {
  const response = await getUsageThroughReactCache({ teamId })

  if (response?.serverError || response?.validationErrors || !response?.data) {
    throw new Error(response?.serverError || 'Failed to load usage')
  }

  // This rerenders the chart placeholder, which makes it look weird when it transitions from loading to empty in some cases.
  // TODO: Fix this.
  if (response.data.sandboxes.length === 0) {
    return (
      <ChartPlaceholder
        key="chart-placeholder-sandboxes"
        emptyContent={<p>No started sandbox data found.</p>}
        classNames={{
          container: 'h-60',
        }}
      />
    )
  }

  return (
    <SandboxesChart
      data={response.data.sandboxes}
      classNames={{
        container: 'h-60',
      }}
    />
  )
}
