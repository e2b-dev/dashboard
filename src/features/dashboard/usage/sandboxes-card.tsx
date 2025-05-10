import { getSandboxesStarted } from '@/server/usage/get-sandboxes-started'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/ui/primitives/card'
import { Suspense } from 'react'
import { SandboxesChart } from './sandboxes-chart'
import { ChartPlaceholder } from '@/ui/chart-placeholder'

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
        <CardTitle className="font-mono">Sandboxes Started</CardTitle>
        <CardDescription>
          The number of sandboxes your team started.
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
  const response = await getSandboxesStarted({ teamId })

  if (response?.serverError || response?.validationErrors || !response?.data) {
    throw new Error(response?.serverError || 'Failed to load usage')
  }

  // This rerenders the chart placeholder, which makes it look weird when it transitions from loading to empty in some cases.
  // TODO: Fix this.
  if (response.data.sandboxesStarted.length === 0) {
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
      data={response.data.sandboxesStarted}
      classNames={{
        container: 'h-60',
      }}
    />
  )
}
