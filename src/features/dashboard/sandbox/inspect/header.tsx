import { Input } from '@/ui/primitives/input'

interface SandboxInspectHeaderProps {
  rootPath: string
  onRootPathChange: (path: string) => void
}

export default function SandboxInspectHeader({
  rootPath,
  onRootPathChange,
}: SandboxInspectHeaderProps) {
  return (
    <div className="flex items-center gap-2 p-8">
      <Input
        className="w-55"
        placeholder="Root Path"
        value={rootPath}
        onChange={(e) => onRootPathChange(e.target.value)}
      />
    </div>
  )
}
