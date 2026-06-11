'use client'

import { Loader } from '@/ui/primitives/loader'

export function LoadMoreButton({
  isLoading,
  onLoadMore,
}: {
  isLoading: boolean
  onLoadMore: () => void
}) {
  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1">
        Loading
        <Loader variant="dots" />
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={onLoadMore}
      className="underline text-fg-secondary hover:text-accent-main-highlight transition-colors"
    >
      Load more
    </button>
  )
}

export function BackToTopButton({ onBackToTop }: { onBackToTop: () => void }) {
  return (
    <button
      type="button"
      onClick={onBackToTop}
      className="underline text-fg-secondary hover:text-accent-main-highlight transition-colors"
    >
      Back to top
    </button>
  )
}
