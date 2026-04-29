import type { Decorator, Preview } from '@storybook/nextjs'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/ui/primitives/toaster'
import { TooltipProvider } from '@/ui/primitives/tooltip'
import {
  type MockActionMode,
  MockActionContext,
} from './mocks/next-safe-action-hooks'
import '../src/styles/globals.css'

const withProviders: Decorator = (Story, ctx) => {
  const actionMode =
    (ctx.parameters?.actionMode as MockActionMode | undefined) ?? 'success'

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <TooltipProvider>
        <MockActionContext.Provider value={actionMode}>
          <div className="bg-bg text-fg flex min-h-[100svh] flex-col items-center justify-center p-8">
            <Story />
          </div>
          <Toaster />
        </MockActionContext.Provider>
      </TooltipProvider>
    </ThemeProvider>
  )
}

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    backgrounds: { disable: true },
    nextjs: {
      appDirectory: true,
      navigation: {
        params: { teamSlug: 'demo-team' },
      },
    },
  },
  decorators: [withProviders],
  initialGlobals: {
    backgrounds: { value: undefined },
  },
}

export default preview
