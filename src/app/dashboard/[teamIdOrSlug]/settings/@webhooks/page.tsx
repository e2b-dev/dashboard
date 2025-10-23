import WebhookAddEditDialog from '@/features/dashboard/settings/webhooks/add-edit-dialog'
import WebhooksTable from '@/features/dashboard/settings/webhooks/table'
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
              send a POST request to the configured URLs.
            </CardDescription>

            <WebhookAddEditDialog mode="add">
              <Button className="w-full sm:w-auto sm:self-start">
                <Plus className="size-4" /> Add Webhook
              </Button>
            </WebhookAddEditDialog>
          </div>
        </CardHeader>

        <CardContent>
          <WebhooksTable params={params} />
        </CardContent>
      </Card>
    </Frame>
  )
}
