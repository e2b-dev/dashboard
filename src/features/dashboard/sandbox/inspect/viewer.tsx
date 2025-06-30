'use client'

import { useContent } from './hooks/use-content'
import { useShikiTheme } from '@/configs/shiki'
import ShikiHighlighter, { Language } from 'react-shiki'
import { useFilesystemNode, useSelectedPath } from './hooks/use-node'
import { FileType } from 'e2b'
import SandboxInspectFrame from './frame'
import SandboxInspectViewerHeader from './viewer-header'
import { ScrollArea, ScrollBar } from '@/ui/primitives/scroll-area'
import { useFileOperations } from './hooks/use-file'

export default function SandboxInspectViewer() {
  const path = useSelectedPath()

  if (!path) {
    return null
  }

  return <SandboxInspectViewerContent path={path} />
}

function SandboxInspectViewerContent({ path }: { path: string }) {
  const node = useFilesystemNode(path)
  const { refresh } = useFileOperations(path)
  const { content } = useContent(path)
  const shikiTheme = useShikiTheme()

  if (content === undefined || node?.type !== FileType.FILE) {
    return null
  }

  const hasDot = node.name.includes('.')
  let language: Language = node.name.split('.').pop() ?? 'text'

  if (!hasDot || (node.name.startsWith('.') && language)) {
    language = 'text'
  }

  return (
    <SandboxInspectFrame
      className="max-w-1/2"
      header={
        <SandboxInspectViewerHeader
          name={node.name}
          content={content}
          isLoading={node.isLoading ?? false}
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
