import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { getWebhooks } from '@/server/webhooks/get-webhooks'
import { TableCell, TableRow } from '@/ui/primitives/table'
import WebhooksEmpty from './empty'
import WebhookTableRow from './table-row'

interface TableBodyContentProps {
  params: Promise<{
    teamIdOrSlug: string
  }>
}

export default async function TableBodyContent({
  params,
}: TableBodyContentProps) {
  const { teamIdOrSlug } = await params
  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  const webhooksResult = await getWebhooks({ teamId })

  // undefined data indicates execution error so we disable the controls
  const hasError = webhooksResult?.data === undefined
  // normalize data field, no matter the execution result
  const data = webhooksResult?.data ? webhooksResult.data : { webhooks: [] }

  if (hasError || !data.webhooks.length) {
    return (
      <TableRow>
        <TableCell colSpan={4}>
          <WebhooksEmpty
            error={
              hasError
                ? 'Failed to get webhooks. Try again or contact support.'
                : undefined
            }
          />
        </TableCell>
      </TableRow>
    )
  }

  return (
    <>
      {data.webhooks.map((webhook, index) => (
        <WebhookTableRow key={webhook.id} webhook={webhook} index={index} />
      ))}
    </>
  )
}
