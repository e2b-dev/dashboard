import { ArrowRightIcon } from '@/ui/primitives/icons'

export function ArrowDivider() {
  return (
    <div className="flex items-center gap-2">
      <span className="h-px flex-1 bg-stroke" aria-hidden />
      <ArrowRightIcon className="size-4 rotate-90 text-fg-tertiary" />
      <span className="h-px flex-1 bg-stroke" aria-hidden />
    </div>
  )
}
