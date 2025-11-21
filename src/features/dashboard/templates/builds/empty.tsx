import { cn } from '@/lib/utils'
import { BuildIcon } from '@/ui/primitives/icons'

interface BuildsEmptyProps {
  error?: string
}

export default function BuildsEmpty({ error }: BuildsEmptyProps) {
  return (
    <div className="h-[35vh] w-full gap-2 relative flex justify-center items-center p-6">
      <BuildIcon
        className={cn('size-5', error && 'text-accent-error-highlight')}
      />
      <p
        className={cn(
          'prose-body-highlight',
          error && 'text-accent-error-highlight'
        )}
      >
        {error ? error : 'No template builds found'}
      </p>
    </div>
  )
}
