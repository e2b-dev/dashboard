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
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/ui/primitives/button'
import { Download } from 'lucide-react'

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
  const { state } = useContent(path)
  const shikiTheme = useShikiTheme()

  if (state === undefined) {
    return null
  }

  return (
    <SandboxInspectFrame
      classNames={{
        frame: 'max-w-1/2 max-md:max-w-full max-md:border-none',
        header: 'max-md:bg-transparent max-md:h-9 max-md:border-none',
      }}
      header={
        <SandboxInspectViewerHeader
          name={name}
          fileContentState={state}
          isLoading={isLoading}
          onRefresh={refresh}
        />
      }
    >
      {state.encoding === 'utf-8' ? (
        <TextContent
          name={name}
          content={state.content}
          shikiTheme={shikiTheme}
        />
      ) : state.encoding === 'image' ? (
        <ImageContent name={name} dataUri={state.dataUri} />
      ) : (
        <BinaryContent name={name} dataUri={state.dataUri} />
      )}
    </SandboxInspectFrame>
  )
}

// ----------------- Content components -----------------

interface TextContentProps {
  name: string
  content: string
  shikiTheme: Parameters<typeof ShikiHighlighter>[0]['theme']
}

function TextContent({ name, content, shikiTheme }: TextContentProps) {
  const hasDot = name.includes('.')
  let language: Language = name.split('.').pop() as Language

  if (!hasDot || (name.startsWith('.') && language)) {
    language = 'text'
  }

  return (
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

interface BinaryContentProps {
  name: string
  dataUri: string
}

function BinaryContent({ name, dataUri }: BinaryContentProps) {
  const handleDownload = useCallback(() => {
    if (!document) {
      return
    }

    const a = document.createElement('a')

    a.href = dataUri
    a.download = name
    a.click()
  }, [dataUri, name])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <span className="text-fg-300 text-sm">
        Binary file preview not available.
      </span>
      <Button variant="accent" size="sm" onClick={handleDownload}>
        Download
        <Download className="ml-1.5 h-4 w-4" />
      </Button>
    </div>
  )
}
