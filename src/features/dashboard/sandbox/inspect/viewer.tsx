'use client'

import { useContent } from './hooks/use-content'
import { useShikiTheme } from '@/configs/shiki'
import ShikiHighlighter, { Language } from 'react-shiki'
import { useSelectedPath } from './hooks/use-node'
import SandboxInspectFrame from './frame'
import SandboxInspectViewerHeader from './viewer-header'
import { ScrollArea, ScrollBar } from '@/ui/primitives/scroll-area'
import { useFile } from './hooks/use-file'

export default function SandboxInspectViewer() {
  const path = useSelectedPath()

  if (!path) {
    return null
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
      className="max-w-1/2"
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
            className="px-1.5 py-1 text-sm"
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
