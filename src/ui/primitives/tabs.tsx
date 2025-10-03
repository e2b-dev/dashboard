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
  const isControlled = value !== undefined
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)

  const currentValue = isControlled ? value : uncontrolledValue

  const handleValueChange = React.useCallback(
    (nextValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(nextValue)
      }
      onValueChange?.(nextValue)
    },
    [isControlled, onValueChange]
  )

  return (
    <TabsContext.Provider value={{ value: currentValue }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        className={cn('flex flex-col', className)}
        value={currentValue}
        onValueChange={handleValueChange}
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
        'inline-flex h-9 w-fit items-center justify-center gap-6 border-b px-6 max-md:px-3',
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
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & { layoutkey: string }) {
  const { value } = React.useContext(TabsContext)
  const isSelected = value === props.value

  return (
    <div className="relative">
      <TabsPrimitive.Trigger
        data-slot="tabs-trigger"
        className={cn(
          "relative inline-flex h-8.25 flex-1 prose-body-highlight cursor-pointer items-center justify-center gap-1.5 pb-1.5 whitespace-nowrap text-fg-tertiary transition-[color,box-shadow] hover:text-fg-secondary focus-visible:ring-1 focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-fg [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          'focus-visible:border-ring focus-visible:ring-ring focus-visible:outline-ring',
          className
        )}
        {...props}
      >
        {children}
      </TabsPrimitive.Trigger>
      {isSelected && (
        <motion.div
          layoutId={props.layoutkey}
          className="border-accent-main-highlight absolute inset-0 -bottom-0.5 border-b"
          initial={false}
          transition={{
            duration: 0.4,
            ease: exponentialSmoothing(),
          }}
        />
      )}
    </div>
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
