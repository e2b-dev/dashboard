// NOTE: We need to maintain duplicate types of the e2b sdk, in order to avoid having the whole sdk inside the client bundle.
// The issue here mainly stems from the FileType and FilesystemEvent enums.

export type FsFileType = 'file' | 'dir'

export interface FsEntry {
  name: string
  path: string
  type: FsFileType
}

export type FsEventType = 'create' | 'write' | 'remove' | 'rename' | 'chmod'

export interface FsEvent {
  name: string
  type: FsEventType
}
