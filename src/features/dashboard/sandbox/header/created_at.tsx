import { SandboxInfo } from '@/types/api'

interface CreatedAtProps {
  startedAt: SandboxInfo['startedAt']
}

export default function CreatedAt({ startedAt }: CreatedAtProps) {
  return <p>{new Date(startedAt).toLocaleString()}</p>
}
