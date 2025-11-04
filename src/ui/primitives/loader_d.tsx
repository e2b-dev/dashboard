import { cn } from '@/lib/utils'
import * as React from 'react'

interface LoaderProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const Loader = React.forwardRef<HTMLSpanElement, LoaderProps>(
  ({ className, size = 'lg', ...props }, ref) => {
    const sizeClass = {
      sm: 'loader-sm',
      md: 'loader-md',
      lg: 'loader-lg',
      xl: 'loader-xl',
    }[size]

    return (
      <span
        ref={ref}
        className={cn(
          'loader font-mono inline-flex items-center justify-center select-none',
          'before:content-["◰"] before:animate-loader-square',
          sizeClass,
          className
        )}
        {...props}
      />
    )
  }
)
Loader.displayName = 'Loader'

export { Loader }
