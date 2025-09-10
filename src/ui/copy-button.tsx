'use client'

import { useClipboard } from '@/lib/hooks/use-clipboard'
import { Button, ButtonProps } from '@/ui/primitives/button'
import { CheckIcon } from 'lucide-react'
import { FC } from 'react'
import { CopyIcon } from './primitives/icons'

interface CopyButtonProps extends ButtonProps {
  value: string
  onCopy?: () => void
}

const CopyButton: FC<CopyButtonProps> = ({
  value,
  onCopy,
  onClick,
  ...props
}) => {
  const [wasCopied, copy] = useClipboard()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    e.preventDefault()
    copy(value)
    onCopy?.()
    onClick?.(e)
  }

  return (
    <Button type="button" size="icon" onClick={handleClick} {...props}>
      {wasCopied ? (
        <CheckIcon className="h-4 w-4" />
      ) : (
        <CopyIcon className="h-4 w-4" />
      )}
    </Button>
  )
}

export default CopyButton
