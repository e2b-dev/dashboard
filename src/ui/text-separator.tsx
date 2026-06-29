import { cn } from '@/lib/utils'
import { Separator } from './primitives/separator'

interface TextSeparatorProps {
  text: string
  classNames?: {
    text?: string
  }
}

export default function TextSeparator({
  text,
  classNames,
}: TextSeparatorProps) {
  return (
    <div className="my-6 flex items-center gap-2">
      <Separator className="bg-fill w-auto flex-grow" />
      <span className={cn('text-fg px-2 font-mono', classNames?.text)}>
        {text}
      </span>
      <Separator className="bg-fill w-auto flex-grow" />
    </div>
  )
}
