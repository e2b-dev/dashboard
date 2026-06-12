'use client'

import { ThemeProvider } from 'next-themes'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { TRPCReactProvider } from '@/trpc/client'
import { Toaster } from '@/ui/primitives/sonner'
import { ToastProvider } from '@/ui/primitives/toast'
import { TooltipProvider } from '@/ui/primitives/tooltip'
import { PostHogProvider } from './posthog-provider'

interface ClientProvidersProps {
  children: React.ReactNode
  postHogEnabled: boolean
}

export default function ClientProviders({
  children,
  postHogEnabled,
}: ClientProvidersProps) {
  return (
    <TRPCReactProvider>
      <NuqsAdapter>
        <PostHogProvider enabled={postHogEnabled}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider>
              <ToastProvider>{children}</ToastProvider>
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </PostHogProvider>
      </NuqsAdapter>
    </TRPCReactProvider>
  )
}
