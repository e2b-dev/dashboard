import CreateApiKeyDialog from '@/features/dashboard/settings/keys/create-api-key-dialog'
import ApiKeysTable from '@/features/dashboard/settings/keys/table'
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

interface KeysPageClientProps {
  params: Promise<{
    teamIdOrSlug: string
  }>
}

export default async function KeysPage({ params }: KeysPageClientProps) {
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
              <CardTitle>Manage API Keys</CardTitle>
              <CardDescription className="max-w-[400px]">
                API Keys are used to authenticate API requests from your teams
                applications.
              </CardDescription>
            </div>

            <CreateApiKeyDialog params={params}>
              <Button className="w-full sm:w-auto sm:self-start">
                <Plus className="size-4" /> CREATE KEY
              </Button>
            </CreateApiKeyDialog>
          </div>
        </CardHeader>

        <CardContent>
          <div className="w-full overflow-x-auto">
            <ApiKeysTable params={params} className="min-w-[800px]" />
          </div>
        </CardContent>
      </Card>
    </Frame>
  )
}
