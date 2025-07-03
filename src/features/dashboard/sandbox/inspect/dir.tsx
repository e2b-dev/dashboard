import { FilesystemNode } from './filesystem/types'
import { AlertCircle, ChevronRight } from 'lucide-react'
import SandboxInspectNode from './node'
import { useDirectory } from './hooks/use-directory'
import { cn } from '@/lib/utils'
import { DataTableRow } from '@/ui/data-table'
import { motion, AnimatePresence } from 'motion/react'
import { FileType } from 'e2b'
import NodeLabel from './node-label'
import SandboxInspectEmptyNode from './empty'

interface SandboxInspectDirProps {
  dir: FilesystemNode & {
    type: FileType.DIR
  }
}

export default function SandboxInspectDir({ dir }: SandboxInspectDirProps) {
  const {
    hasError,
    error,
    isExpanded,
    toggle,
    isLoading,
    isLoaded,
    hasChildren,
    children,
  } = useDirectory(dir.path)

  return (
    <>
      <DataTableRow
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            toggle()
          }
        }}
        className={cn(
          'group hover:bg-bg-200 focus:ring-ring focus:bg-bg-200 h-7 cursor-pointer gap-1 truncate transition-none select-none even:bg-transparent focus:outline-none'
        )}
        data-slot="inspect-dir"
      >
        <motion.span
          initial={{
            rotate: isExpanded && isLoaded ? 90 : 0,
          }}
          animate={{
            rotate: isExpanded && isLoaded ? 90 : 0,
            color:
              isExpanded && isLoaded
                ? 'var(--color-fg)'
                : 'var(--color-fg-500)',
          }}
        >
          <ChevronRight className="ml-1 size-4" />
        </motion.span>
        <NodeLabel
          name={dir.name}
          isActive={isExpanded}
          isLoading={isLoading}
        />
        {hasError && (
          <span className="text-error flex items-center gap-1 truncate pt-0.5 pl-1 text-xs text-ellipsis">
            <AlertCircle className="size-3" />
            {error}
          </span>
        )}
      </DataTableRow>

      <AnimatePresence initial={false}>
        {isExpanded && isLoaded && (
          <motion.div
            key="dir-content"
            className="flex flex-col pl-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15, ease: 'circOut' }}
          >
            <AnimatePresence initial={false}>
              {hasChildren ? (
                children.map((child) => (
                  <motion.div
                    key={child.path}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.1, ease: 'circOut' }}
                  >
                    <SandboxInspectNode path={child.path} />
                  </motion.div>
                ))
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.1, ease: 'circOut' }}
                >
                  <SandboxInspectEmptyNode />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
