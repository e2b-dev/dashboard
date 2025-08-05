import { CLI_GENERATED_KEY_NAME } from '@/configs/api'
import { bailOutFromPPR } from '@/lib/utils/server'
import { getTeamApiKeys } from '@/server/keys/get-api-keys'
import { ErrorIndicator } from '@/ui/error-indicator'
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert'
import { TableCell, TableRow } from '@/ui/primitives/table'
import ApiKeyTableRow from './table-row'

interface TableBodyContentProps {
  teamId: string
}

export default async function TableBodyContent({
  teamId,
}: TableBodyContentProps) {
  bailOutFromPPR()

  const result = await getTeamApiKeys({ teamId })

  if (!result?.data || result.serverError || result.validationErrors) {
    return (
      <TableRow>
        <TableCell colSpan={5}>
          <ErrorIndicator
            description={'Could not load API keys'}
            message={result?.serverError || 'Unknown error'}
            className="bg-bg mt-2 w-full max-w-full"
          />
        </TableCell>
      </TableRow>
    )
  }

  const { apiKeys } = result.data

  if (apiKeys.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={5}>
          <Alert className="text-left" variant="info">
            <AlertTitle>No API Keys</AlertTitle>
            <AlertDescription>
              No API keys found for this team.
            </AlertDescription>
          </Alert>
        </TableCell>
      </TableRow>
    )
  }

  const normalKeys = apiKeys.filter(
    (key) => key.name !== CLI_GENERATED_KEY_NAME
  )
  const cliKeys = apiKeys.filter((key) => key.name === CLI_GENERATED_KEY_NAME)

  return (
    <>
      {normalKeys.map((key, index) => (
        <ApiKeyTableRow key={key.id} apiKey={key} index={index} />
      ))}
      {cliKeys.map((key, index) => (
        <ApiKeyTableRow
          key={key.id}
          apiKey={key}
          index={index + normalKeys.length}
        />
      ))}
    </>
  )
}
