import { redirect } from 'next/navigation'
import { buildOryStartURL } from '@/core/server/auth/ory/build-start-url'

type PageProps = {
  searchParams: Promise<{ returnTo?: string }>
}

export default async function Page({ searchParams }: PageProps) {
  const { returnTo } = await searchParams
  redirect(buildOryStartURL('signup', returnTo))
}
