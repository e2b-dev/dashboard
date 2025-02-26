import { getTeamApiKeys } from '@/server/keys/get-api-keys'
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert'
import { TableCell, TableRow } from '@/ui/primitives/table'
import ApiKeyTableRow from './table-row'
import { bailOutFromPPR } from '@/lib/utils/server'
import { ErrorIndicator } from '@/ui/error-indicator'

interface TableBodyContentProps {
  teamId: string
}

export default async function TableBodyContent({
  teamId,
}: TableBodyContentProps) {
  bailOutFromPPR()

  const result = await getTeamApiKeys({ teamId })

  if (result.type === 'error') {
    ;<TableRow>
      <TableCell colSpan={5}>
        <ErrorIndicator
          description={'Could not load API keys'}
          message={result.message}
          className="bg-bg mt-2 w-full max-w-full"
        />
      </TableCell>
    </TableRow>
    return
  }

  const { apiKeys } = result.data

  if (apiKeys.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={5}>
          <Alert className="text-left" variant="contrast2">
            <AlertTitle>No API Keys</AlertTitle>
            <AlertDescription>
              No API keys found for this team.
            </AlertDescription>
          </Alert>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <>
      {apiKeys.map((key, index) => (
        <ApiKeyTableRow key={key.id} apiKey={key} index={index} />
      ))}
    </>
  )
}
