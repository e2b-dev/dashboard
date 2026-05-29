import { HistoryIcon } from '@/ui/primitives/icons'

interface TagHistoryEmptyProps {
  tag: string
}

export function TagHistoryEmpty({ tag }: TagHistoryEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <HistoryIcon className="size-5 text-icon-tertiary" />
      <p className="prose-body text-fg-tertiary">
        No assignment history for tag{' '}
        <span className="prose-body-highlight text-fg">{tag}</span>.
      </p>
    </div>
  )
}
