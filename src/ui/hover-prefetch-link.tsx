'use client'

import Link from 'next/link'
import { type ComponentPropsWithoutRef, forwardRef, useState } from 'react'

type HoverPrefetchLinkProps = Omit<
  ComponentPropsWithoutRef<typeof Link>,
  'prefetch' | 'onMouseEnter'
>

export const HoverPrefetchLink = forwardRef<
  HTMLAnchorElement,
  HoverPrefetchLinkProps
>(function HoverPrefetchLink({ href, children, ...props }, ref) {
  const [active, setActive] = useState(false)

  return (
    <Link
      ref={ref}
      href={href}
      prefetch={active ? true : false}
      onMouseEnter={() => setActive(true)}
      {...props}
    >
      {children}
    </Link>
  )
})

HoverPrefetchLink.displayName = 'HoverPrefetchLink'
