import type { EvaluatedFeatureFlag } from '@/core/server/feature-flags/list.server'
import { Badge } from '@/ui/primitives/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/primitives/table'

function formatFlagValue(value: unknown) {
  if (typeof value === 'boolean') {
    return value ? 'Enabled' : 'Disabled'
  }

  return JSON.stringify(value)
}

function FlagValueBadge({ value }: { value: unknown }) {
  if (typeof value !== 'boolean') {
    return <Badge variant="code">{formatFlagValue(value)}</Badge>
  }

  return (
    <Badge variant={value ? 'positive' : 'default'}>
      {formatFlagValue(value)}
    </Badge>
  )
}

export function FeatureFlagsTable({
  flags,
  teamId,
  teamSlug,
}: {
  flags: EvaluatedFeatureFlag[]
  teamId: string
  teamSlug: string
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="prose-title text-fg">Admin</h1>
        <p className="prose-body text-fg-secondary">
          Feature flags evaluated for this team.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="code">team: {teamSlug}</Badge>
          <Badge variant="code">team_id: {teamId}</Badge>
        </div>
      </div>

      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[28%]">Flag</TableHead>
            <TableHead className="w-[20%]">LD Key</TableHead>
            <TableHead className="w-[16%]">Value</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flags.length === 0 ? (
            <TableEmptyState colSpan={4}>
              No feature flags configured
            </TableEmptyState>
          ) : (
            flags.map((flag) => (
              <TableRow key={flag.id} className="h-12">
                <TableCell className="py-0">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-fg">{flag.id}</span>
                    <span className="text-fg-tertiary uppercase prose-label">
                      {flag.kind}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-0 font-mono text-fg-secondary">
                  {flag.key}
                </TableCell>
                <TableCell className="py-0">
                  <FlagValueBadge value={flag.value} />
                </TableCell>
                <TableCell className="py-0 text-fg-secondary">
                  {flag.description ?? '-'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
