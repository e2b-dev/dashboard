import { DataTableRow } from '@/ui/data-table'
import NodeLabel from './node-label'

export default function SandboxInspectEmptyNode() {
  return (
    <DataTableRow className="text-fg-500 h-7 cursor-default gap-1.5 px-2.25 italic select-none group-[data-slot=inspect-dir]:px-2">
      <NodeLabel name="[empty directory]" className="text-fg-500" />
    </DataTableRow>
  )
}
