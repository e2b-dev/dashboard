import { useClipboard } from '@/lib/hooks/use-clipboard'
import { Button, ButtonProps } from '@/ui/primitives/button'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { FC } from 'react'

interface CopyButtonProps extends ButtonProps {
  value: string
  onCopy?: () => void
}

const CopyButton: FC<CopyButtonProps> = ({ value, onCopy, ...props }) => {
  const [wasCopied, copy] = useClipboard()

  return (
    <Button
      size="icon"
      onClick={() => {
        copy(value)
        onCopy?.()
      }}
      {...props}
    >
      {wasCopied ? (
        <CheckIcon className="h-4 w-4" />
      ) : (
        <CopyIcon className="h-4 w-4" />
      )}
    </Button>
  )
}

export default CopyButton
