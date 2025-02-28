'use client'

import { Alert, AlertDescription } from '@/ui/primitives/alert'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

// TODO: this type is used in more places than just authentication
// -> should probably be renamed / moved to a more appropriate location

export type AuthMessage =
  | { success?: string }
  | { error?: string }
  | { message?: string }

export function AuthFormMessage({
  className,
  message,
}: {
  className?: string
  message: AuthMessage
}) {
  return (
    <motion.div
      className={cn('flex w-full max-w-md flex-col gap-2', className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
    >
      {'success' in message && (
        <Alert variant="contrast1">
          <CheckCircle2 className="text-contrast-1 h-4 w-4" />
          <AlertDescription>
            {decodeURIComponent(message.success!)}
          </AlertDescription>
        </Alert>
      )}
      {'error' in message && (
        <Alert variant="error">
          <AlertCircle className="text-error h-4 w-4" />
          <AlertDescription>
            {decodeURIComponent(message.error!)}
          </AlertDescription>
        </Alert>
      )}
      {'message' in message && (
        <Alert variant="contrast2">
          <Info className="text-contrast-2 h-4 w-4" />
          <AlertDescription>
            {decodeURIComponent(message.message!)}
          </AlertDescription>
        </Alert>
      )}
    </motion.div>
  )
}
