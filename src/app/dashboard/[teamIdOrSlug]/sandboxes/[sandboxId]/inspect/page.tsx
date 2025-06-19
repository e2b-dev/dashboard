'use client'

import { LOCAL_STORAGE_KEYS } from '@/configs/keys'
import { SandboxInspectProvider } from '@/features/dashboard/sandbox/inspect/context'
import SandboxInspectFilesystem from '@/features/dashboard/sandbox/inspect/filesystem'
import SandboxInspectHeader from '@/features/dashboard/sandbox/inspect/header'
import { useLocalStorage } from 'usehooks-ts'

export default function SandboxInspectPage() {
  const [rootPath, setRootPath] = useLocalStorage(
    LOCAL_STORAGE_KEYS.SANDBOX_INSPECT_ROOT_PATH,
    '/'
  )

  return (
    <SandboxInspectProvider rootPath={rootPath}>
      <SandboxInspectHeader
        rootPath={rootPath}
        onRootPathChange={setRootPath}
      />
      <SandboxInspectFilesystem />
    </SandboxInspectProvider>
  )
}
