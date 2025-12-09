import CopyButton from '@/ui/copy-button'

interface RangeLabelProps {
  label: string
  copyValue: string
}

export function RangeLabel({ label, copyValue }: RangeLabelProps) {
  return (
    <div className="flex items-center gap-2 max-md:w-full max-md:min-w-0">
      <CopyButton
        value={copyValue}
        className="size-4 max-md:hidden"
        title="Copy ISO 8601 time interval"
      />
      <span
        className="text-fg py-0.5 max-md:text-[11px] md:text-xs prose-label-highlight truncate min-w-0"
        style={{ letterSpacing: '0%' }}
        title={copyValue}
      >
        {label}
      </span>
      <CopyButton
        value={copyValue}
        className="size-4 md:hidden flex-shrink-0"
        title="Copy ISO 8601 time interval"
      />
    </div>
  )
}
