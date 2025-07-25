import type { InferMetaType, InferPageType } from 'fumadocs-core/source'
import { loader } from 'fumadocs-core/source'
import { icons } from 'lucide-react'
import { createElement } from 'react'
import { IconContainer } from '../src/ui/icons'
// @ts-expect-error not available
import { docs } from './.source'

export const source = loader({
  baseUrl: '/docs',
  icon(icon) {
    if (icon && icon in icons)
      return createElement(IconContainer, {
        icon: icons[icon as keyof typeof icons],
      })
  },
  source: docs.toFumadocsSource(),
})

export type Page = InferPageType<typeof source>
export type Meta = InferMetaType<typeof source>
