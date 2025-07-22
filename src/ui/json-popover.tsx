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
  className?: string
}

export function JsonPopover({ json, children, className }: JsonPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)

  const shikiTheme = useShikiTheme()

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="slate"
          className={cn(
            'h-full w-full cursor-pointer justify-start truncate p-0 font-sans whitespace-nowrap',
            className
          )}
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
