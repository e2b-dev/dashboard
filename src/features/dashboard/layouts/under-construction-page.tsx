import { Page } from '@/features/dashboard/layouts/page'

export function UnderConstructionPage({ title }: { title: string }) {
  return (
    <Page className="flex flex-col gap-1">
      <h2 className="prose-title text-fg">{title}</h2>
      <p className="prose-body text-fg-tertiary">Under construction</p>
    </Page>
  )
}
