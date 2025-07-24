'use client'

import { cn, exponentialSmoothing } from '@/lib/utils'
import { isActive } from '@/lib/utils/docs'
import { Button, buttonVariants } from '@/ui/primitives/button'
import { Separator } from '@/ui/primitives/separator'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { PageTree } from 'fumadocs-core/server'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

const variants = {
  container: {
    hidden: {
      opacity: 0,
      height: 0,
      marginTop: 0,
      marginBottom: 0,
      transition: {
        duration: 0.15,
        ease: exponentialSmoothing(5),
      },
    },
    show: {
      opacity: 1,
      height: 'auto',
      marginTop: '0.3rem',
      marginBottom: '0.3rem',
      transition: {
        height: {
          duration: 0.15,
        },
        staggerChildren: 0.05,
        ease: exponentialSmoothing(5),
      },
    },
  } satisfies Variants,

  item: {
    hidden: {
      opacity: 0,
      x: -4,
      transition: { duration: 0.1, ease: exponentialSmoothing(5) },
    },
    show: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.1, ease: exponentialSmoothing(5) },
    },
  } satisfies Variants,
}

interface SidebarItemProps {
  item: PageTree.Node
  level?: number
}

export default function SidebarItem({ item, level = 0 }: SidebarItemProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = React.useState(true)

  if (item.type === 'separator') {
    return (
      <p className="text-fg mt-8 mb-2 font-mono text-[0.65rem] uppercase first:mt-0">
        {item.name}
      </p>
    )
  }

  if (item.type === 'folder') {
    const active = item.index?.url && pathname.startsWith(item.index?.url)

    return (
      <div className="mb-3 flex flex-col">
        <Button
          variant="ghost"
          onClick={() => setIsOpen(!isOpen)}
          size="slate"
          className="flex w-full cursor-pointer items-center justify-start gap-1 p-0 normal-case"
        >
          <span
            className={cn(
              'text-fg-500 truncate font-sans',
              active && 'text-accent'
            )}
          >
            {item.name}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{
              type: 'spring',
              stiffness: 350,
              damping: 15,
            }}
            className="text-fg-300 ml-auto"
          >
            <ChevronRight className="text-fg-500 size-4" />
          </motion.div>
        </Button>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              variants={variants.container}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="flex overflow-hidden pl-1"
            >
              <Separator orientation="vertical" className="mr-2 h-[inherit]" />
              <div className="flex flex-col gap-1">
                {item.children?.map((child, index) => (
                  <motion.div variants={variants.item} key={index}>
                    <SidebarItem item={child} level={level + 1} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Regular item (link)
  const active = isActive(item.url, pathname, false)

  return (
    <Link
      href={item.url}
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'slate' }),
        'group text-fg-500 hover:text-fg w-full justify-start pr-6 font-sans text-sm normal-case',
        active && 'text-accent hover:text-accent'
      )}
    >
      {item.icon}
      <span className="truncate">{item.name}</span>
    </Link>
  )
}
