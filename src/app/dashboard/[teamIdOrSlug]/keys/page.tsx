import CreateApiKeyDialog from '@/features/dashboard/keys/create-api-key-dialog'
import ApiKeysTable from '@/features/dashboard/keys/table'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import Frame from '@/ui/frame'
import { Button } from '@/ui/primitives/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import { Plus } from 'lucide-react'
import { Suspense } from 'react'

interface KeysPageClientProps {
  params: Promise<{
    teamIdOrSlug: string
  }>
}

export default async function KeysPage({ params }: KeysPageClientProps) {
  const { teamIdOrSlug } = await params
  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  return (
    <Frame
      classNames={{
        wrapper: 'w-full max-md:p-0',
        frame: 'max-md:border-none',
      }}
    >
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex flex-col gap-2">
              <CardTitle>Manage Team Keys</CardTitle>
              <CardDescription className="max-w-[400px]">
                Organization keys are used to authenticate API requests from
                your organization's applications.
              </CardDescription>
            </div>

            <Suspense fallback={null}>
              <CreateApiKeyDialog teamId={teamId}>
                <Button className="w-full sm:w-auto sm:self-start">
                  <Plus className="size-4" /> CREATE KEY
                </Button>
              </CreateApiKeyDialog>
            </Suspense>
          </div>
        </CardHeader>

        <CardContent>
          <div className="w-full overflow-x-auto">
            <ApiKeysTable teamId={teamId} className="min-w-[800px]" />
          </div>
        </CardContent>
      </Card>
    </Frame>
  )
}
