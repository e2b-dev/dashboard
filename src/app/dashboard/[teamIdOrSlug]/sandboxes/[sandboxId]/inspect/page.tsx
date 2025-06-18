import { SandboxInspectProvider } from '@/features/dashboard/sandbox/inspect/context'
import SandboxInspectFilesystem from '@/features/dashboard/sandbox/inspect/filesystem'

export default function SandboxInspectPage() {
  return (
    <SandboxInspectProvider rootPath="/">
      <SandboxInspectFilesystem />
    </SandboxInspectProvider>
  )
}
