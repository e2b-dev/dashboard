'use client'

import { useShikiTheme } from '@/configs/shiki'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/ui/primitives/popover'
import { useState } from 'react'
import ShikiHighlighter from 'react-shiki'
import { Button } from './primitives/button'
import { ScrollArea, ScrollBar } from './primitives/scroll-area'

interface JsonPopoverProps {
  json: unknown
  children: React.ReactNode
  buttonProps?: React.ComponentPropsWithoutRef<typeof Button>
  className?: string
}

export function JsonPopover({
  json,
  children,
  buttonProps,
  className,
}: JsonPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)

  const shikiTheme = useShikiTheme()

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="quaternary"
          size="none"
          className={cn('cursor-pointer justify-start truncate font-sans whitespace-nowrap', className)}
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            setIsOpen(true)
          }}
          onDoubleClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            setIsOpen(true)
          }}
          {...buttonProps}
        >
          {children}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-4">
        <ScrollArea hideCorner className="h-[400px] max-w-full">
          <ShikiHighlighter
            language="json"
            theme={shikiTheme}
            className="text-xs"
            addDefaultStyles={false}
            showLanguage={false}
          >
            {JSON.stringify(json, null, 2)}
          </ShikiHighlighter>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
