import { redirect } from 'next/navigation'

interface ByocPageProps {
  params: Promise<{ teamSlug: string }>
}

export default async function ByocPage({ params }: ByocPageProps) {
  const { teamSlug } = await params
  redirect(`/dashboard/${teamSlug}/byoc/configuration`)
}
