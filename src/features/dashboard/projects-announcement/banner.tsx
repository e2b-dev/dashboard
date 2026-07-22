'use client'

import { useEffect, useState } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { CloseIcon, ExternalLinkIcon } from '@/ui/primitives/icons'

export const PROJECTS_ANNOUNCEMENT_URL = 'https://e2b.dev/docs/projects'

const PROJECTS_ANNOUNCEMENT_DISMISSED_KEY =
  'e2b-projects-announcement-dismissed'

export function ProjectsAnnouncementBanner() {
  const [dismissed, setDismissed] = useLocalStorage(
    PROJECTS_ANNOUNCEMENT_DISMISSED_KEY,
    false,
    { initializeWithValue: false }
  )

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || dismissed) return null

  const dismiss = () => setDismissed(true)

  return (
    <div className="bg-bg-inverted text-fg-inverted relative flex w-full shrink-0 items-center justify-center gap-2 overflow-hidden px-10 py-1.5">
      <a
        href={PROJECTS_ANNOUNCEMENT_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={dismiss}
        className="prose-body-highlight text-fg-inverted inline-flex cursor-pointer items-center gap-1.5 hover:underline"
      >
        Teams are being renamed to projects
        <ExternalLinkIcon className="size-4 shrink-0" />
      </a>
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={dismiss}
        className="text-fg-inverted/70 hover:text-fg-inverted absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
      >
        <CloseIcon className="size-4" />
      </button>
    </div>
  )
}
