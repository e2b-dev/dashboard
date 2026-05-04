import type { HTMLAttributes, Ref } from 'react'
import { cn } from '@/lib/utils'
import styles from './loader.module.css'

type LoaderVariant = 'slash' | 'square' | 'dots'
type LoaderSize = 'sm' | 'md' | 'lg' | 'xl'

interface LoaderProps extends HTMLAttributes<HTMLDivElement> {
  variant?: LoaderVariant
  size?: LoaderSize
  ref?: Ref<HTMLDivElement>
}

const variantClassMap: Record<LoaderVariant, string | undefined> = {
  slash: styles.variantSlash,
  square: styles.variantSquare,
  dots: styles.variantDots,
}

const sizeClassMap: Record<LoaderSize, string | undefined> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
  xl: styles.sizeXl,
}

const Loader = ({
  className,
  variant = 'slash',
  size = 'md',
  ref,
  ...props
}: LoaderProps) => (
  <div
    ref={ref}
    className={cn(
      styles.loader,
      variantClassMap[variant],
      sizeClassMap[size],
      className
    )}
    {...props}
  >
    <span className={styles.content} />
  </div>
)

export { Loader }
