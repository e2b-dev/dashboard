import { Input } from '@/ui/primitives/input'

export default function SandboxInspectHeader() {
  return (
    <div className="flex items-center gap-2 p-8">
      <Input className="w-55" placeholder="Root Path" />
    </div>
  )
}
