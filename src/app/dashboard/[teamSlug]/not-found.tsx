import NotFound from '@/ui/not-found'

export default function TeamNotFound() {
  return (
    <div className="flex min-h-[calc(100dvh-var(--protected-navbar-height)-var(--protected-footer-height))] flex-col md:-m-10 2xl:-m-24">
      <NotFound />
    </div>
  )
}
