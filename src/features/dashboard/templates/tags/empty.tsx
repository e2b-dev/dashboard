'use client'

import { TagIcon } from '@/ui/primitives/icons'

interface TagsEmptyProps {
  hasSearch: boolean
}

export default function TagsEmpty({ hasSearch }: TagsEmptyProps) {
  return (
    <div className="h-[35svh] w-full flex flex-col items-center justify-center gap-2 text-center px-4">
      <TagIcon className="size-6 text-fg-tertiary" />
      <div className="flex flex-col gap-1">
        <p className="prose-body-highlight text-fg">
          {hasSearch ? 'No matching tags' : 'No tags yet'}
        </p>
        <p className="prose-body text-fg-tertiary max-w-80 text-balance">
          {hasSearch
            ? 'Try a different search term.'
            : 'Tags identify builds. Assign one when you promote a build to a named release.'}
        </p>
      </div>
    </div>
  )
}
