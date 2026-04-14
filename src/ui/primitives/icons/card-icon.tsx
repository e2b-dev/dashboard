import { Icon } from '@/ui/primitives/icons/icon'
import type { IconProps } from '@/ui/primitives/icons/types'

export const CardIcon = (props: IconProps) => (
  <Icon name="Card" viewBox="0 0 20 20" {...props}>
    <path
      d="M2.5 8.33317V15.8332H17.5V8.33317M2.5 8.33317V4.1665H17.5V8.33317M2.5 8.33317H17.5"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="1.66667"
    />
  </Icon>
)
