import { cn } from '@/lib/utils'
import { DataTableRow } from '@/ui/data-table'
import { FolderUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import path from 'path'
import { useTransition } from 'react'

interface SandboxInspectParentDirItemProps {
  rootPath: string
}

export default function SandboxInspectParentDirItem({
  rootPath,
}: SandboxInspectParentDirItemProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Don't render if we're at the root already
  if (rootPath === '/' || rootPath === '') {
    return null
  }

  const handleNavigateUp = async () => {
    const parentPath = path.dirname(rootPath)

    try {
      await fetch('/api/sandbox/inspect/root-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: parentPath }),
      })

      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      console.error('Failed to navigate to parent directory', error)
    }
  }

  return (
    <DataTableRow
      role="button"
      tabIndex={0}
      className={cn(
        'hover:bg-bg-200 focus:ring-ring text-fg-500 focus:bg-bg-200 h-7 min-h-7 cursor-pointer gap-1.5 pl-1.5 transition-none group-[data-slot=inspect-dir]:px-2 even:bg-transparent focus:outline-none',
        isPending && 'opacity-70'
      )}
      onClick={handleNavigateUp}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleNavigateUp()
        }
      }}
    >
      <FolderUp className="size-3.5 [color:var(--color-fg-500)]" />
      <span className="truncate">..</span>
    </DataTableRow>
  )
}
