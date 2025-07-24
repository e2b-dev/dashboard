import type { Preview } from '@storybook/react'
import { themes } from '@storybook/theming'

import '../src/styles/globals.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    darkMode: {
      dark: { ...themes.dark, appBg: 'black', previewBg: 'black' },
      light: { ...themes.normal, appBg: 'white', previewBg: 'white' },
      stylePreview: true,
    },
  },
}

export default preview
