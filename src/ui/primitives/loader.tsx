import * as React from 'react'
import styled, { css } from 'styled-components'

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'slash' | 'square'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

interface StyledLoaderProps {
  $variant: string
  $size: string
}

const StyledLoader = styled.div<StyledLoaderProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  user-select: none;

  ${({ $size }: StyledLoaderProps) => {
    switch ($size) {
      case 'sm':
        return css`
          font-size: 0.875rem;
        `
      case 'lg':
        return css`
          font-size: 1.125rem;
        `
      case 'xl':
        return css`
          font-size: 1.5rem;
        `
      default:
        return css`
          font-size: 1rem;
        `
    }
  }}

  .loader-content::before {
    ${({ $variant }: StyledLoaderProps) => {
      switch ($variant) {
        case 'slash':
          return css`
            content: '|';
            animation: slashAnimation 0.4s linear infinite;
          `
        default:
          return css`
            content: '◰';
            animation: squareAnimation 0.4s linear infinite;
          `
      }
    }}
  }
`

const Loader = React.forwardRef<HTMLDivElement, LoaderProps>(
  ({ className, variant = 'square', size = 'md', ...props }, ref) => {
    return (
      <>
        <style jsx global>{`
          @keyframes slashAnimation {
            0% {
              content: '|';
            }
            25% {
              content: '/';
            }
            50% {
              content: '-';
            }
            75% {
              content: '\\';
            }
            100% {
              content: '|';
            }
          }
          @keyframes squareAnimation {
            0% {
              content: '◰';
            }
            25% {
              content: '◳';
            }
            50% {
              content: '◲';
            }
            75% {
              content: '◱';
            }
            100% {
              content: '◰';
            }
          }
        `}</style>
        <StyledLoader
          ref={ref}
          $variant={variant}
          $size={size}
          className={className}
          {...props}
        >
          <span className="loader-content" />
        </StyledLoader>
      </>
    )
  }
)
Loader.displayName = 'Loader'

export { Loader }
