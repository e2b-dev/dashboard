import WebhookAddEditDialog from '@/features/dashboard/settings/webhooks/add-edit-dialog'
import WebhooksEmpty from '@/features/dashboard/settings/webhooks/empty'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { getWebhooks } from '@/server/webhooks/get-webhooks'
import Frame from '@/ui/frame'
import { Button } from '@/ui/primitives/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/ui/primitives/card'
import { Plus } from 'lucide-react'

interface WebhooksPageClientProps {
  params: Promise<{
    teamIdOrSlug: string
  }>
}

export default async function WebhooksPage({
  params,
}: WebhooksPageClientProps) {
  const { teamIdOrSlug } = await params
  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  const webhooksResult = await getWebhooks({ teamId })

  // undefined data indicates execution error so we disable the controls
  const hasError = webhooksResult?.data === undefined
  // normalize data field, no matter the execution result
  const data = webhooksResult?.data ? webhooksResult.data : { webhooks: [] }

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
            <CardDescription className="max-w-[600px] text-fg">
              Webhooks allow your external service to be notified when sandbox
              lifecycle events happen. When the specified event happens, we'll
              send a POST request to the URL you provide.
            </CardDescription>

            <WebhookAddEditDialog mode="add">
              <Button className="w-full sm:w-auto sm:self-start">
                <Plus className="size-4" />{' '}
                {data.webhooks.length === 0
                  ? 'Add a Webhook'
                  : 'Add new Webhook'}
              </Button>
            </WebhookAddEditDialog>
          </div>
        </CardHeader>

        <CardContent>
          {!hasError && data.webhooks.length > 0 ? (
            <> </>
          ) : (
            <WebhooksEmpty
              error={
                hasError
                  ? 'Failed to get webhooks. Try again or contact support.'
                  : undefined
              }
            />
          )}
        </CardContent>
      </Card>
    </Frame>
  )
}
