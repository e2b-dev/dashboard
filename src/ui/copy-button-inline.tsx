import { useClipboard } from '@/lib/hooks/use-clipboard'
import { cn } from '@/lib/utils/ui'
import { CheckIcon, CopyIcon } from '@/ui/primitives/icons'

export default function CopyButtonInline({
  value,
  children,
  className,
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const [wasCopied, copy] = useClipboard(2000)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    copy(value)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'relative inline-flex min-w-0 items-center bg-transparent p-0 text-left hover:opacity-80',
        'group/copy cursor-pointer border-0',
        className
      )}
    >
      <span className="truncate pr-4">{children}</span>
      <span
        className={cn(
          'absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover/copy:opacity-100',
          wasCopied && 'opacity-100!'
        )}
        aria-hidden="true"
      >
        {wasCopied ? (
          <CheckIcon className="size-3.5 text-icon" />
        ) : (
          <CopyIcon className="size-3.5 text-icon-secondary" />
        )}
      </span>
    </button>
  )
}
