import ApiKeysTable from '@/features/dashboard/keys/table'
import CreateApiKeyDialog from '@/features/dashboard/keys/create-api-key-dialog'
import { Button } from '@/ui/primitives/button'
import { CardDescription, CardTitle } from '@/ui/primitives/card'
import { Suspense } from 'react'
import DashboardPageLayout from '@/features/dashboard/page-layout'
import { Plus } from 'lucide-react'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'

interface KeysPageClientProps {
  params: Promise<{
    teamIdOrSlug: string
  }>
}

export default async function KeysPage({ params }: KeysPageClientProps) {
  const { teamIdOrSlug } = await params
  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  return (
    <DashboardPageLayout title="API Keys">
      <div className="grid w-full gap-6 p-4 sm:gap-8 sm:p-6">
        <section className="grid gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex flex-col gap-1">
              <CardTitle>Manage Team Keys</CardTitle>
              <CardDescription className="max-w-[400px]">
                Organization keys are used to authenticate API requests from
                your organization's applications
              </CardDescription>
            </div>

            <Suspense fallback={null}>
              <CreateApiKeyDialog teamId={teamId}>
                <Button className="w-full sm:w-auto">
                  <Plus className="size-4" /> CREATE KEY
                </Button>
              </CreateApiKeyDialog>
            </Suspense>
          </div>

          <div className="-mx-4 w-full overflow-x-auto sm:mx-0">
            <ApiKeysTable teamId={teamId} className="min-w-[800px]" />
          </div>
        </section>
      </div>
    </DashboardPageLayout>
  )
}
