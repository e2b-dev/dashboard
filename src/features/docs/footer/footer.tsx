'use client'

import { Button } from '@/ui/primitives/button'
import { findNeighbour } from 'fumadocs-core/server'
import { useTreeContext } from 'fumadocs-ui/provider'
import { MoveLeft, MoveRight } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Footer() {
  const tree = useTreeContext()
  const path = usePathname()

  const neighbours = findNeighbour(tree.root, path)

  return (
    <footer className="flex flex-row items-center justify-between">
      {neighbours.previous && (
        <Button variant="outline" size="lg" asChild>
          <Link href={neighbours.previous.url}>
            <MoveLeft className="text-fg-secondary size-4" />
            {neighbours.previous.name}
          </Link>
        </Button>
      )}
      {neighbours.next && (
        <Button variant="outline" size="lg" asChild>
          <Link href={neighbours.next.url}>
            {neighbours.next.name}
            <MoveRight className="text-fg-secondary size-4" />
          </Link>
        </Button>
      )}
    </footer>
  )
}
