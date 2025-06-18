import { SandboxInfo } from '@/types/api'

interface SandboxDetailsHeaderProps {
  sandboxInfo: SandboxInfo
}

export default function SandboxDetailsHeader({
  sandboxInfo,
}: SandboxDetailsHeaderProps) {
  return (
    <header className="flex w-full flex-wrap items-center justify-between gap-4 p-8">
      {Object.entries(sandboxInfo).map(([key, value]) => (
        <div key={key}>
          <p className="text-fg-300 text-sm font-medium">{key}</p>
          <p className="text-sm">
            {typeof value === 'string' ? value : JSON.stringify(value)}
          </p>
        </div>
      ))}
    </header>
  )
}
