import { FsFileType } from '@/types/filesystem'

interface FilesystemDir {
  type: 'dir'
  name: string
  path: string
  children: string[] // paths of children
  isExpanded?: boolean
  isLoaded?: boolean
  isSelected?: boolean
  isLoading?: boolean
  error?: string
}

interface FilesystemFile {
  type: 'file'
  name: string
  path: string
  isSelected?: boolean
}

export type FilesystemNode = FilesystemDir | FilesystemFile

export interface FilesystemOperations {
  loadDirectory: (path: string) => Promise<void>
  selectNode: (path: string) => void
  toggleDirectory: (path: string) => Promise<void>
  refreshDirectory: (path: string) => Promise<void>
}
