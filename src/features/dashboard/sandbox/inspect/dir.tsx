import { FilesystemNode } from './filesystem/types'
import { ChevronRight } from 'lucide-react'
import SandboxInspectNode from './node'
import { useDirectory } from './hooks/use-directory'
import { cn } from '@/lib/utils'
import { Loader } from '@/ui/loader'
import { DataTableRow } from '@/ui/data-table'
import { motion } from 'motion/react'

interface SandboxInspectDirProps {
  dir: FilesystemNode & {
    type: 'dir'
  }
}

export default function SandboxInspectDir({ dir }: SandboxInspectDirProps) {
  const { isExpanded, toggle, isLoading, hasChildren, children } = useDirectory(
    dir.path
  )

  return (
    <>
      <DataTableRow
        role="button"
        tabIndex={0}
        onClick={() => toggle()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            toggle()
          }
        }}
        className={cn(
          'hover:bg-bg-200 cursor-pointer gap-1 py-1 transition-none select-none',
          {
            'animate-pulse': isLoading,
          }
        )}
      >
        <motion.span
          animate={{
            rotate: isExpanded ? 90 : 0,
          }}
        >
          <ChevronRight className="text-fg-300 size-4" />
        </motion.span>
        <span className="text-left font-sans">{dir.name}</span>
        {isLoading && <Loader className="ml-2" />}
      </DataTableRow>

      {isExpanded && (
        <div className="flex flex-col pl-2">
          {children.map((child) => (
            <SandboxInspectNode key={child.path} path={child.path} />
          ))}
        </div>
      )}
    </>
  )
}
