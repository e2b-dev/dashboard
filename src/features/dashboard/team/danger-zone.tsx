import { bailOutFromPPR } from '@/lib/utils/server'
import { getTeam } from '@/server/team/get-team'
import { UnknownError } from '@/types/errors'
import { AlertDialog } from '@/ui/alert-dialog'
import ErrorBoundary from '@/ui/error'
import { Alert } from '@/ui/primitives/alert'
import { Button } from '@/ui/primitives/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'

interface DangerZoneProps {
  teamId: string
}

export function DangerZone({ teamId }: DangerZoneProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Danger Zone</CardTitle>
        <CardDescription>
          Actions here can't be undone. Please proceed with caution.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <DangerZoneContent teamId={teamId} />
      </CardContent>
    </Card>
  )
}

async function DangerZoneContent({ teamId }: { teamId: string }) {
  const res = await getTeam({ teamId })

  if (res.type === 'error') {
    return (
      <ErrorBoundary
        error={
          {
            name: 'Team Error',
            message: res.message,
          } satisfies Error
        }
        description={'Could not load team'}
      />
    )
  }

  const team = res.data

  return (
    <>
      <div className="flex items-center justify-between p-4">
        <div className="flex flex-col gap-1">
          <h4 className="font-medium">Leave Team</h4>
          <p className="text-fg-500 font-sans text-sm">
            Remove yourself from this Team
          </p>
        </div>

        <AlertDialog
          title="Leave Team"
          description="Are you sure you want to leave this team?"
          confirm="Leave"
          onConfirm={() => {}}
          trigger={
            <Button variant="muted" disabled={!team || team?.is_default}>
              Leave Team
            </Button>
          }
        />
      </div>

      <div className="flex items-center justify-between p-4">
        <div className="flex flex-col gap-1">
          <h4 className="text-fg font-medium">Delete Team</h4>
          <p className="text-fg-500 font-sans text-sm">
            Permanently delete this team and all of its data
          </p>
        </div>
        <Button variant="error">Delete Team</Button>
      </div>
    </>
  )
}
