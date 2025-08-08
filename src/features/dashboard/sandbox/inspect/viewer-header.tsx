import CopyButton from '@/ui/copy-button'
import { Button } from '@/ui/primitives/button'
import { Download, FileIcon, RefreshCcw, X } from 'lucide-react'
import { motion } from 'motion/react'
import { FileContentState } from './filesystem/store'

interface SandboxInspectViewerHeaderProps {
  name: string
  fileContentState?: FileContentState
  isLoading: boolean
  onRefresh: () => void
  onClose: () => void
  onDownload: () => void
}

export default function SandboxInspectViewerHeader({
  name,
  fileContentState,
  isLoading,
  onRefresh,
  onClose,
  onDownload,
}: SandboxInspectViewerHeaderProps) {
  return (
    <div className="flex h-full flex-1 items-center gap-2 p-1 px-2 max-md:px-4">
      <FileIcon className="size-3.5" />
      <span className="mr-auto ">{name}</span>

      {fileContentState?.type === 'text' && (
        <CopyButton
          variant="ghost"
          size="iconSm"
          value={fileContentState.text}
        />
      )}

      <Button variant="ghost" size="iconSm" onClick={onDownload}>
        <Download className="h-4 w-4" />
      </Button>

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

      <Button variant="ghost" size="iconSm" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
