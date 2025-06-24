import { FileType } from 'e2b'

interface FilesystemDir {
  type: FileType.DIR
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
  type: FileType.FILE
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
