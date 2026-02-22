'use client'

import { useClipboard } from '@/lib/hooks/use-clipboard'
import { EASE_APPEAR } from '@/lib/utils/ui'
import { IconButton, IconButtonProps } from '@/ui/primitives/icon-button'
import { CheckIcon, CopyIcon } from '@/ui/primitives/icons'
import { AnimatePresence, motion } from 'motion/react'
import { FC } from 'react'

interface CopyButtonProps extends IconButtonProps {
  value: string
  onCopy?: () => void
}

const CopyButton: FC<CopyButtonProps> = ({ value, onCopy, ...props }) => {
  const [wasCopied, copy] = useClipboard(1000)

  return (
    <IconButton
      onClick={() => {
        copy(value)
        onCopy?.()
      }}
      {...props}
    >
      <AnimatePresence mode="wait" initial={false}>
        {wasCopied ? (
          <motion.div
            key="check"
            initial={{ opacity: 0.2, scale: 0.97, filter: 'blur(1px)' }}
            animate={{ opacity: 1.2, scale: 1.2, filter: 'blur(0px)' }}
            exit={{ opacity: 0.2, scale: 0.97, filter: 'blur(1px)' }}
            transition={{ duration: 0.1, ease: EASE_APPEAR }}
          >
            <CheckIcon />
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ opacity: 0.2, scale: 0.9, filter: 'blur(1px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0.2, scale: 0.9, filter: 'blur(1px)' }}
            transition={{ duration: 0.1, ease: EASE_APPEAR }}
          >
            <CopyIcon />
          </motion.div>
        )}
      </AnimatePresence>
    </IconButton>
  )
}

export default CopyButton
