import { Loader } from '@/ui/primitives/loader'

export default function LoadingLayout() {
  return (
    <div className="flex h-full w-full flex-1 items-center justify-center">
      <Loader className="text-xl" />
    </div>
  )
}
