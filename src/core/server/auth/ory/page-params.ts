import type { OryPageParams } from '@ory/nextjs/app'

type OrySearchParams = Awaited<OryPageParams['searchParams']>

export async function normalizeOryPageParams(
  searchParams: OryPageParams['searchParams']
): Promise<OrySearchParams> {
  const params = await searchParams

  if (params.flow || !params.id) return params

  return {
    ...params,
    flow: params.id,
  }
}
