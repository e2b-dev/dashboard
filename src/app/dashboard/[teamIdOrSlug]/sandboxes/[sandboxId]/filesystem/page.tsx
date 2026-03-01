import { COOKIE_KEYS } from '@/configs/cookies'
import SandboxInspectView from '@/features/dashboard/sandbox/inspect/view'
import { cookies } from 'next/headers'

const DEFAULT_ROOT_PATH = '/home/user'

export default async function SandboxInspectPage() {
  const cookieStore = await cookies()
  const rootPath =
    cookieStore.get(COOKIE_KEYS.SANDBOX_INSPECT_ROOT_PATH)?.value ||
    DEFAULT_ROOT_PATH

  return <SandboxInspectView rootPath={rootPath} />
}
