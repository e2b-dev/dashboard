import BuildHeader from '@/features/dashboard/build/header'

export default async function BuildPage({
  params,
}: PageProps<'/dashboard/[teamIdOrSlug]/templates/[templateId]/builds/[buildId]'>) {
  return (
    <div className="h-full min-h-0 flex-1 p-3 md:p-6 flex flex-col gap-3">
      <BuildHeader params={params} />
    </div>
  )
}
