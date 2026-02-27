import { cookies } from 'next/headers'
import { COOKIE_KEYS } from '@/configs/cookies'
import SandboxInspectView from '@/features/dashboard/sandbox/inspect/view'
import { getSandboxRoot } from '@/server/sandboxes/get-sandbox-root'

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
    <SandboxInspectView
      rootPath={rootPath}
      seedEntries={res?.data?.entries ?? []}
    />
  )
}
