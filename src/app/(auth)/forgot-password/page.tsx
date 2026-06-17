import { redirect } from 'next/navigation'

type PageProps = {
  searchParams: Promise<{ returnTo?: string }>
}

// Legacy entry path: forward to the same-origin Kratos recovery flow page,
// preserving the post-login destination as Ory's `return_to`.
export default async function Page({ searchParams }: PageProps) {
  const { returnTo } = await searchParams
  const query = returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : ''
  redirect(`/recovery${query}`)
}
