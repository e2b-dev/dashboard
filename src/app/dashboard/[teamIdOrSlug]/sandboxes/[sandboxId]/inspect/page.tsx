import { COOKIE_KEYS } from '@/configs/keys'
import { SandboxInspectProvider } from '@/features/dashboard/sandbox/inspect/context'
import SandboxInspectFilesystem from '@/features/dashboard/sandbox/inspect/filesystem'
import SandboxInspectViewer from '@/features/dashboard/sandbox/inspect/viewer'
import { cn } from '@/lib/utils'
import { getSandboxRoot } from '@/server/sandboxes/get-sandbox-root'
import ClientOnly from '@/ui/client-only'
import { cookies } from 'next/headers'

const DEFAULT_ROOT_PATH = '/home/user'

export default async function SandboxInspectPage({
  params,
}: {
  params: Promise<{ teamIdOrSlug: string; sandboxId: string }>
}) {
  const cookieStore = await cookies()
  const rootPath =
    cookieStore.get(COOKIE_KEYS.SANDBOX_INSPECT_ROOT_PATH)?.value ||
    DEFAULT_ROOT_PATH

  const { teamIdOrSlug, sandboxId } = await params

  const res = await getSandboxRoot({
    teamIdOrSlug,
    sandboxId,
    rootPath,
  })

  return (
    <SandboxInspectProvider
      rootPath={rootPath}
      seedEntries={res?.data?.entries ?? []}
    >
      <ClientOnly
        className={cn(
          'flex flex-1 gap-4 overflow-hidden p-3 md:p-6',
          'max-md:sticky max-md:top-0 max-md:min-h-[calc(100vh-var(--protected-navbar-height))]'
        )}
      >
        <SandboxInspectFilesystem rootPath={rootPath} />
        <SandboxInspectViewer />
      </ClientOnly>
    </SandboxInspectProvider>
  )
}
