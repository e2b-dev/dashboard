import { cn } from '@/lib/utils'
import { WebhookIcon } from '@/ui/primitives/icons'

interface WebhooksEmptyProps {
  error?: string
}

export default function WebhooksEmpty({ error }: WebhooksEmptyProps) {
  return (
    <div className="h-36 w-full gap-2 relative flex justify-center items-center p-6">
      <WebhookIcon
        className={cn('size-5', error && 'text-accent-error-highlight')}
      />
      <p
        className={cn(
          'prose-body-highlight',
          error && 'text-accent-error-highlight'
        )}
      >
        {error ? error : 'No webhooks added yet'}
      </p>
    </div>
  )
}
