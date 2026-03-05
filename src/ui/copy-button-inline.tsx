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
    <span
      onClick={handleClick}
      className={cn(
        'relative inline-flex items-center min-w-0 group/copy cursor-pointer hover:opacity-80',
        className
      )}
    >
      <span className="truncate">{children}</span>
      <span
        className={cn(
          'absolute left-full ml-1 opacity-0 group-hover/copy:opacity-100',
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
    </span>
  )
}
