'use client'

import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as React from 'react'

import { cn, exponentialSmoothing } from '@/lib/utils'
import { motion } from 'motion/react'

const TabsContext = React.createContext<{
  value?: string
}>({})

function Tabs({
  className,
  defaultValue,
  value,
  onValueChange,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const [stateValue, setStateValue] = React.useState(defaultValue ?? value)

  React.useEffect(() => {
    if (!stateValue) return

    onValueChange?.(stateValue)
  }, [stateValue, onValueChange])

  return (
    <TabsContext.Provider value={{ value: stateValue }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        className={cn('flex flex-col', className)}
        value={stateValue}
        onValueChange={setStateValue}
        {...props}
      />
    </TabsContext.Provider>
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'inline-flex h-9 w-fit items-center justify-center gap-3 border-b px-6',
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { value } = React.useContext(TabsContext)
  const isSelected = value === props.value

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-8.25 flex-1 cursor-pointer items-center justify-center gap-1.5 pb-1.5 whitespace-nowrap !text-[hsl(var(--color-accent))] text-[hsl(var(--color-fg-300))] transition-[color,box-shadow] hover:text-[hsl(var(--color-fg-200))] focus-visible:ring-1 focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-[hsl(var(--color-fg))] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        'focus-visible:border-[hsl(var(--color-ring))] focus-visible:ring-[hsl(var(--color-ring)/0.5)] focus-visible:outline-[hsl(var(--color-ring))]',
        className
      )}
      {...props}
    >
      {children}
      {isSelected && (
        <motion.div
          layoutId="tabs-indicator"
          className="border-accent absolute inset-0 -bottom-0.5 border-b"
          initial={false}
          transition={{
            duration: 0.4,
            ease: exponentialSmoothing(),
          }}
        />
      )}
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
