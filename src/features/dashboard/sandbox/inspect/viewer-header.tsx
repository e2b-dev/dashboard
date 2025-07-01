import { Download, FileIcon, RefreshCcw } from 'lucide-react'
import { Button } from '@/ui/primitives/button'
import { motion } from 'motion/react'
import CopyButton from '@/ui/copy-button'
import { FileContentState } from './filesystem/store'
import { useCallback } from 'react'

interface SandboxInspectViewerHeaderProps {
  name: string
  fileContentState?: FileContentState
  isLoading: boolean
  onRefresh: () => void
}

export default function SandboxInspectViewerHeader({
  name,
  fileContentState,
  isLoading,
  onRefresh,
}: SandboxInspectViewerHeaderProps) {
  const handleDownload = useCallback(() => {
    if (
      !fileContentState ||
      fileContentState.encoding === 'utf-8' ||
      !document
    ) {
      return
    }

    const a = document.createElement('a')

    a.href = fileContentState.dataUri
    a.download = name
    a.click()
  }, [fileContentState, name])

  return (
    <div className="flex h-full flex-1 items-center gap-2 p-1 px-2 max-md:px-4">
      <FileIcon className="size-3.5" />
      <span className="text-sm">{name}</span>

      {fileContentState?.encoding === 'utf-8' ? (
        <CopyButton
          variant="ghost"
          size="iconSm"
          value={fileContentState.content}
          className="ml-auto"
        />
      ) : (
        <Button
          variant="ghost"
          size="iconSm"
          className="ml-auto"
          onClick={handleDownload}
        >
          <Download className="h-4 w-4" />
        </Button>
      )}

      <Button
        variant="ghost"
        size="iconSm"
        onClick={onRefresh}
        disabled={isLoading}
      >
        <motion.div
          initial={false}
          animate={{ rotate: isLoading ? 360 : 0 }}
          transition={{
            duration: 1,
            repeat: isLoading ? Infinity : 0,
            ease: 'easeInOut',
            type: 'spring',
            bounce: 0,
          }}
        >
          <RefreshCcw className="h-4 w-4" />
        </motion.div>
      </Button>
    </div>
  )
}
