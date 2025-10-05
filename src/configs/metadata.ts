import type { Metadata } from 'next'
import { BASE_URL } from './urls'

const COVER_IMAGE = new URL('/metadata/cover.png', BASE_URL).toString()

export const METADATA: Metadata = {
  title: 'E2B | The Enterprise AI Agent Cloud',
  description:
    'E2B Gives AI Agents Secure Computers with Real-World Tools. E2B is Used by 88% of Fortune 100 Companies for Frontier Agentic Workflows.',
  openGraph: {
    locale: 'en',
    url: BASE_URL,
    type: 'website',
    siteName: 'E2B',
    title: 'E2B | The Enterprise AI Agent Cloud',
    description:
      'E2B Gives AI Agents Secure Computers with Real-World Tools. E2B is Used by 88% of Fortune 100 Companies for Frontier Agentic Workflows.',
    images: {
      url: COVER_IMAGE,
      width: 1200,
      height: 630,
      alt: 'E2B Share Image',
    },
  },
  twitter: {
    card: 'summary_large_image',
    site: '@e2b',
    creator: '@e2b',
    title: 'E2B | The Enterprise AI Agent Cloud',
    description:
      'E2B Gives AI Agents Secure Computers with Real-World Tools. E2B is Used by 88% of Fortune 100 Companies for Frontier Agentic Workflows.',
    images: COVER_IMAGE,
  },
}
