import { Icon } from '@/ui/primitives/icons/icon'
import type { IconProps } from '@/ui/primitives/icons/types'

export const UnhealthyIcon = (props: IconProps) => (
  <Icon name="Unhealthy" viewBox="0 0 16 16" {...props}>
    <path
      d="M8.00001 9.99983L8.66667 7.99983L6.66667 5.99981C6.99174 5.19207 7.41381 4.48783 8.00001 3.8454C12.1079 -0.321391 19.1501 7.41697 8.00001 13.6665C-3.01458 7.49297 3.72348 -0.133445 7.84887 3.69867"
      stroke="currentColor"
      strokeWidth="1.33333"
    />
  </Icon>
)
