import { Icon } from '@/ui/primitives/icons/icon'
import type { IconProps } from '@/ui/primitives/icons/types'

export const CopyIcon = (props: IconProps) => (
  <Icon name="Copy" viewBox="0 0 16 16" {...props}>
    <path
      d="M9.83398 6V2H1.83398V10H5.83398M5.83398 6H13.834V14H5.83398V6Z"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="1.33333"
    />
  </Icon>
)
