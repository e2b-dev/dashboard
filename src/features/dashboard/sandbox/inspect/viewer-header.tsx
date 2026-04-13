import CopyButton from '@/ui/copy-button'
import { IconButton } from '@/ui/primitives/icon-button'
import { RefreshIcon, CloseIcon, DownloadIcon, FileIcon } from '@/ui/primitives/icons'
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
        <CopyButton value={fileContentState.text} />
      )}

      <IconButton onClick={onDownload}>
        <DownloadIcon />
      </IconButton>

      <IconButton onClick={onRefresh} disabled={isLoading}>
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
          <RefreshIcon />
        </motion.div>
      </IconButton>

      <IconButton onClick={onClose}>
        <CloseIcon />
      </IconButton>
    </div>
  )
}
