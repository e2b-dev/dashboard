import { getTeamMembers } from '@/server/team/get-team-members'
import { ErrorIndicator } from '@/ui/error-indicator'
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert'
import { TableCell, TableRow } from '@/ui/primitives/table'
import MemberTableRow from './member-table-row'

interface TableBodyContentProps {
  params: Promise<{
    teamIdOrSlug: string
  }>
}

export default async function MemberTableBody({
  params,
}: TableBodyContentProps) {
  const { teamIdOrSlug } = await params

  try {
    const result = await getTeamMembers({ teamIdOrSlug })

    if (!result?.data || result.serverError || result.validationErrors) {
      throw new Error(result?.serverError || 'Unknown error')
    }

    const members = result.data

    if (members.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5}>
            <Alert className="text-left" variant="info">
              <AlertTitle>No Members</AlertTitle>
              <AlertDescription>No team members found.</AlertDescription>
            </Alert>
          </TableCell>
        </TableRow>
      )
    }

    return (
      <>
        {members.map((member, index) => (
          <MemberTableRow
            key={member.info.id}
            member={member}
            index={index}
            addedByEmail={
              members.find((m) => m.info.id === member.relation.added_by)?.info
                .email
            }
          />
        ))}
      </>
    )
  } catch (error) {
    return (
      <TableRow>
        <TableCell colSpan={5}>
          <ErrorIndicator
            description={'Could not load team members'}
            message={error instanceof Error ? error.message : 'Unknown error'}
            className="bg-bg mt-2 w-full max-w-full"
          />
        </TableCell>
      </TableRow>
    )
  }
}
