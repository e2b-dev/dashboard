'use client'

import { useContent } from './hooks/use-content'
import { useShikiTheme } from '@/configs/shiki'
import ShikiHighlighter, { Language } from 'react-shiki'
import { useErrorPaths, useSelectedPath } from './hooks/use-node'
import SandboxInspectFrame from './frame'
import SandboxInspectViewerHeader from './viewer-header'
import { ScrollArea, ScrollBar } from '@/ui/primitives/scroll-area'
import { useFile } from './hooks/use-file'
import { Drawer, DrawerContent } from '@/ui/primitives/drawer'
import { useIsMobile } from '@/lib/hooks/use-mobile'
import { useEffect, useState } from 'react'

export default function SandboxInspectViewer() {
  const path = useSelectedPath()
  const isMobile = useIsMobile()
  const errorPaths = useErrorPaths()

  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (path && !errorPaths.has(path)) {
      setOpen(true)
    }
  }, [path, errorPaths])

  if (!path) {
    return null
  }

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mt-4 h-[90svh] overflow-hidden p-0">
          <SandboxInspectViewerContent path={path} />
        </DrawerContent>
      </Drawer>
    )
  }

  return <SandboxInspectViewerContent path={path} />
}

function SandboxInspectViewerContent({ path }: { path: string }) {
  const { name, isLoading, refresh } = useFile(path)
  const { content } = useContent(path)
  const shikiTheme = useShikiTheme()

  if (content === undefined) {
    return null
  }

  const hasDot = name.includes('.')
  let language: Language = name.split('.').pop() ?? 'text'

  if (!hasDot || (name.startsWith('.') && language)) {
    language = 'text'
  }

  return (
    <SandboxInspectFrame
      classNames={{
        frame: 'max-w-1/2 max-md:max-w-full max-md:border-none',
        header: 'max-md:bg-transparent max-md:h-9',
      }}
      header={
        <SandboxInspectViewerHeader
          name={name}
          content={content}
          isLoading={isLoading}
          onRefresh={refresh}
        />
      }
    >
      <div className="h-full w-full overflow-hidden">
        <ScrollArea className="h-full">
          <ShikiHighlighter
            language={language}
            theme={shikiTheme}
            className="px-1.5 py-1 text-sm max-md:p-3"
            addDefaultStyles={false}
            showLanguage={false}
          >
            {content}
          </ShikiHighlighter>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </SandboxInspectFrame>
  )
}
