import { Loader } from '@/ui/primitives/loader_d'

export default function LoadingLayout() {
  return (
    <div className="flex h-full w-full flex-1 items-center justify-center">
      <Loader className="text-xl" />
    </div>
  )
}
