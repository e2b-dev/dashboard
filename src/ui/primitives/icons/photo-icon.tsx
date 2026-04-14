import { Icon } from '@/ui/primitives/icons/icon'
import type { IconProps } from '@/ui/primitives/icons/types'

export const PhotoIcon = (props: IconProps) => (
  <Icon name="Photo" viewBox="0 0 16 16" {...props}>
    <path
      d="M2.95097 9.26083L4.56309 8.05469C5.10742 7.69183 5.8346 7.77749 6.27975 8.25683C7.2747 9.32836 8.42824 10.3025 9.99984 10.3025C11.2879 10.3025 12.1896 9.87796 13.024 9.13343M2.6665 2.66663H13.3332V13.3333H2.6665V2.66663ZM11.3332 5.99996C11.3332 6.73636 10.7362 7.33329 9.99984 7.33329C9.26344 7.33329 8.6665 6.73636 8.6665 5.99996C8.6665 5.26358 9.26344 4.66663 9.99984 4.66663C10.7362 4.66663 11.3332 5.26358 11.3332 5.99996Z"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="1.33333"
    />
  </Icon>
)
