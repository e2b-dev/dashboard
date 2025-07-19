import { FileType } from 'e2b'

interface FilesystemDir {
  type: FileType.DIR
  name: string
  path: string
  children: string[] // paths of children
  isExpanded?: boolean
}

interface FilesystemFile {
  type: FileType.FILE
  name: string
  path: string
}

export type FilesystemNode = FilesystemDir | FilesystemFile

export interface FilesystemOperations {
  loadDirectory: (path: string) => Promise<void>
  toggleDirectory: (path: string) => Promise<void>
  refreshDirectory: (path: string) => Promise<void>
  selectNode: (path: string) => void
  resetSelected: () => void
  refreshFile: (path: string) => Promise<void>
  downloadFile: (path: string) => Promise<void>
}
