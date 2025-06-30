'use client'

import { useContent } from './hooks/use-content'
import { useShikiTheme } from '@/configs/shiki'
import ShikiHighlighter, { Language } from 'react-shiki'
import { useFilesystemNode, useSelectedPath } from './hooks/use-node'
import { FileType } from 'e2b'

export default function SandboxInspectViewer() {
  const path = useSelectedPath()

  if (!path) {
    return null
  }

  return <SandboxInspectViewerContent path={path} />
}

function SandboxInspectViewerContent({ path }: { path: string }) {
  const node = useFilesystemNode(path)
  const { content } = useContent(path)
  const shikiTheme = useShikiTheme()

  if (!content || node?.type !== FileType.FILE) {
    return null
  }

  let language: Language = node.name.split('.').pop()

  // handle hidden files
  if (node.name.startsWith('.') && language) {
    language = 'bash'
  }

  return (
    <div className="w-full overflow-auto">
      <ShikiHighlighter
        language={language ?? 'bash'}
        theme={shikiTheme}
        className="text-sm"
        addDefaultStyles={false}
        showLanguage={false}
      >
        {content}
      </ShikiHighlighter>
    </div>
  )
}
