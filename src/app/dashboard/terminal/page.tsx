import type { Metadata } from 'next/types'
import { TerminalLaunchPage } from '@/features/dashboard/terminal/terminal-launch-page'

export const metadata: Metadata = {
  title: 'Terminal - E2B',
  robots: 'noindex, nofollow',
}

interface TerminalPageProps {
  searchParams: Promise<{
    command?: string
    sandboxId?: string
    template?: string
  }>
}

export default async function TerminalPage({
  searchParams,
}: TerminalPageProps) {
  const { command = '', sandboxId, template } = await searchParams
  return (
    <TerminalLaunchPage
      command={command}
      sandboxId={sandboxId}
      template={template}
    />
  )
}
