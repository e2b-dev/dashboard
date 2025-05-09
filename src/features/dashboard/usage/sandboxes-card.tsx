import { getSandboxesStarted } from '@/server/usage/get-sandboxes-started'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/ui/primitives/card'
import { Loader } from '@/ui/loader'
import { Suspense } from 'react'
import { SandboxesChart } from './sandboxes-chart'
import { EmptyChart } from '@/ui/empty-chart'

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
            <div className="flex h-32 w-full items-end justify-center gap-1 px-2 pt-8 pb-2">
              <Loader />
            </div>
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

  return response.data.sandboxesStarted.length > 0 ? (
    <SandboxesChart data={response.data.sandboxesStarted} />
  ) : (
    <EmptyChart />
  )
}
