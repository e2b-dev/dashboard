'use client'

import { ThemeProvider } from 'next-themes'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { TRPCReactProvider } from '@/trpc/client'
import { Toaster } from '@/ui/primitives/sonner'
import { ToastProvider } from '@/ui/primitives/toast'
import { TooltipProvider } from '@/ui/primitives/tooltip'
import type { PostHogEnvironment } from './posthog-provider'
import { PostHogProvider } from './posthog-provider'

interface ClientProvidersProps {
  children: React.ReactNode
  postHogEnabled: boolean
  postHogEnvironment: PostHogEnvironment
}

export default function ClientProviders({
  children,
  postHogEnabled,
  postHogEnvironment,
}: ClientProvidersProps) {
  return (
    <TRPCReactProvider>
      <NuqsAdapter>
        <PostHogProvider
          enabled={postHogEnabled}
          environment={postHogEnvironment}
        >
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
