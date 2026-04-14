import { Icon } from '@/ui/primitives/icons/icon'
import type { IconProps } from '@/ui/primitives/icons/types'

export const DotIcon = (props: IconProps) => (
  <Icon name="Dot" viewBox="0 0 12 12" {...props}>
    <circle cx="6" cy="6" r="2.5" fill="currentColor" />
  </Icon>
)
