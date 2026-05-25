import { isOryAuthEnabled } from '@/configs/flags'
import { OryHostedAuthRedirect } from '@/features/auth/ory-hosted-auth-redirect'
import SignUp from './signup-form'

interface PageProps {
  searchParams: Promise<{ returnTo?: string }>
}

export default async function Page({ searchParams }: PageProps) {
  if (isOryAuthEnabled()) {
    const { returnTo } = await searchParams
    return <OryHostedAuthRedirect returnTo={returnTo} />
  }
  return <SignUp />
}
