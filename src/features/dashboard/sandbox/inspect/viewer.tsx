'use client'

import { useShikiTheme } from '@/configs/shiki'
import { useIsMobile } from '@/lib/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { Button } from '@/ui/primitives/button'
import { Drawer, DrawerContent } from '@/ui/primitives/drawer'
import { ScrollArea, ScrollBar } from '@/ui/primitives/scroll-area'
import { AnimatePresence } from 'framer-motion'
import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import ShikiHighlighter, { Language } from 'react-shiki'
import SandboxInspectFrame from './frame'
import { useContent } from './hooks/use-content'
import { useFile } from './hooks/use-file'
import { useErrorPaths, useSelectedPath } from './hooks/use-node'
import SandboxInspectViewerHeader from './viewer-header'

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

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mt-4 h-[90svh] overflow-hidden p-0">
          <AnimatePresence mode="wait">
            {path && <SandboxInspectViewerContent key="viewer" path={path} />}
          </AnimatePresence>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <AnimatePresence mode="wait">
      {path && <SandboxInspectViewerContent key="viewer" path={path} />}
    </AnimatePresence>
  )
}

function SandboxInspectViewerContent({ path }: { path: string }) {
  const { name, isLoading, refresh, toggle, download } = useFile(path)
  const { state } = useContent(path)
  const shikiTheme = useShikiTheme()

  if (state === undefined || !name) {
    return null
  }

  return (
    <SandboxInspectFrame
      classNames={{
        frame: 'max-md:max-w-full max-md:border-none max-h-full',
        header: 'max-md:bg-transparent max-md:h-9 max-md:border-none',
      }}
      initial={{
        opacity: 0,
        flex: 0,
      }}
      animate={{
        opacity: 1,
        flex: 1,
      }}
      exit={{
        opacity: 0,
        flex: 0,
      }}
      transition={{ duration: 0.15, ease: 'circOut' }}
      header={
        <SandboxInspectViewerHeader
          name={name}
          fileContentState={state}
          isLoading={isLoading}
          onRefresh={refresh}
          onClose={toggle}
          onDownload={download}
        />
      }
    >
      {state.type === 'text' ? (
        <TextContent
          name={name}
          content={state.text}
          shikiTheme={shikiTheme}
          onDownload={download}
        />
      ) : state.type === 'image' ? (
        <ImageContent name={name} dataUri={state.dataUri} />
      ) : (
        <UnreadableContent onDownload={download} />
      )}
    </SandboxInspectFrame>
  )
}

// ----------------- Content components -----------------

interface TextContentProps {
  name: string
  content: string
  shikiTheme: Parameters<typeof ShikiHighlighter>[0]['theme']
  onDownload: () => void
}

function TextContent({
  name,
  content,
  shikiTheme,
  onDownload,
}: TextContentProps) {
  const hasDot = name.includes('.')
  let language: Language = name.split('.').pop() as Language

  if (!hasDot || (name.startsWith('.') && language)) {
    language = 'text'
  }

  if (content.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <span className="text-fg-secondary ">This file is empty.</span>
        <Button variant="warning" size="sm" onClick={onDownload}>
          Download
          <Download className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <ScrollArea className="h-full">
        <ShikiHighlighter
          language={language}
          theme={shikiTheme}
          className={cn(
            'font-fira-code [&_*]:font-fira-code px-1.5 py-1 text-xs max-md:p-3'
          )}
          addDefaultStyles={false}
          showLanguage={false}
        >
          {content}
        </ShikiHighlighter>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}

interface ImageContentProps {
  name: string
  dataUri: string
}

function ImageContent({ name, dataUri }: ImageContentProps) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto p-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUri}
        alt={name}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  )
}

interface UnreadableContent {
  onDownload: () => void
}

function UnreadableContent({ onDownload }: UnreadableContent) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <span className="text-fg-secondary ">This file is not readable.</span>
      <Button variant="warning" size="sm" onClick={onDownload}>
        Download
        <Download className="ml-1.5 h-4 w-4" />
      </Button>
    </div>
  )
}
