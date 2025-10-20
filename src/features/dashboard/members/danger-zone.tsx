import { getTeam } from '@/server/team/get-team'
import { AlertDialog } from '@/ui/alert-dialog'
import ErrorBoundary from '@/ui/error'
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
  const res = await getTeam({ teamIdOrSlug: teamId })

  if (!res?.data || res.serverError || res.validationErrors) {
    return (
      <ErrorBoundary
        error={
          {
            name: 'Team Error',
            message: res?.serverError || 'Unknown error',
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
          <h4 className="">Leave Team</h4>
          <p className="text-fg-tertiary font-sans ">
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
          <h4 className="text-fg ">Delete Team</h4>
          <p className="text-fg-tertiary font-sans ">
            Permanently delete this team and all of its data
          </p>
        </div>
        <Button variant="error">Delete Team</Button>
      </div>
    </>
  )
}
