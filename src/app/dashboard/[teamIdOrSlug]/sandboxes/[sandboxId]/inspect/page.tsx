import { SandboxInspectProvider } from '@/features/dashboard/sandbox/inspect/context'
import SandboxInspectFilesystem from '@/features/dashboard/sandbox/inspect/filesystem'
import SandboxInspectFilesystemHeader from '@/features/dashboard/sandbox/inspect/filesystem-header'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { getSandboxRoot } from '@/server/sandboxes/get-sandbox-root'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { COOKIE_KEYS } from '@/configs/keys'
import SandboxInspectViewer from '@/features/dashboard/sandbox/inspect/viewer'
import SandboxInspectFrame from '@/features/dashboard/sandbox/inspect/frame'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

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

  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  const res = await getSandboxRoot({
    teamId,
    sandboxId,
    rootPath,
  })

  if (!res?.data) {
    if (res?.serverError !== 'ROOT_PATH_NOT_FOUND') {
      throw notFound()
    }
  }

  return (
    <SandboxInspectProvider
      teamId={teamId}
      rootPath={rootPath}
      seedEntries={res.data?.entries ?? []}
    >
      <div className="relative flex flex-1 gap-2 overflow-hidden p-4">
        <SandboxInspectFrame
          header={<SandboxInspectFilesystemHeader rootPath={rootPath} />}
          className="w-1/2"
        >
          <SandboxInspectFilesystem />
        </SandboxInspectFrame>
        <SandboxInspectViewer />
      </div>
    </SandboxInspectProvider>
  )
}
