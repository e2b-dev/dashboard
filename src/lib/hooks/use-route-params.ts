'use client'

import { useParams } from 'next/navigation'

type ExtractParams<T extends string> =
  T extends `${string}/[${infer Param}]/${infer Rest}`
    ? { [K in Param]: string } & ExtractParams<`/${Rest}`>
    : T extends `${string}/[${infer Param}]`
      ? { [K in Param]: string }
      : object

export function useRouteParams<T extends string>(): ExtractParams<T> {
  return useParams() as ExtractParams<T>
}
