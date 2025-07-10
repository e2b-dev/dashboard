import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/page'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
/* import { Popup, PopupContent, PopupTrigger } from "fumadocs-twoslash/ui"; */
/* import * as Preview from "@/components/preview"; */
import { createMetadata, metadataImage } from '@/configs/fumadocs'
import { METADATA } from '@/configs/metadata'
import components from '@/features/docs/components'
import Footer from '@/features/docs/footer/footer'
import { source } from '@/lib/source'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/ui/primitives/button'

/* function PreviewRenderer({ preview }: { preview: string }): ReactNode {
  if (preview && preview in Preview) {
    const Comp = Preview[preview as keyof typeof Preview];
    return <Comp />;
  }

  return null;
} */

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>
}): Promise<React.ReactElement<unknown>> {
  const params = await props.params

  const page = source.getPage(params.slug)

  if (!page) notFound()

  const path = `src/content/docs/${page.file.path}`
  const { body: Mdx, toc, lastModified } = page.data

  return (
    <DocsPage
      toc={toc}
      lastUpdate={lastModified}
      full={page.data.full}
      tableOfContent={{
        style: 'clerk',
        single: false,
      }}
      editOnGithub={{
        repo: 'dashboard',
        owner: 'e2b-dev',
        sha: 'main',
        path,
        className: cn(
          buttonVariants({ variant: 'outline' }),
          'text-xs text-fg'
        ),
      }}
      footer={{
        component: <Footer />,
      }}
      article={{
        className: 'pb-16 xl:pt-10 max-w-3xl xl:ml-0',
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        {/*         {preview ? <PreviewRenderer preview={preview} /> : null} */}
        <Mdx components={components({ slug: params.slug || [] })} />
        {/*         {page.data.index ? <DocsCategory page={page} from={source} /> : null} */}
      </DocsBody>
    </DocsPage>
  )
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>
}): Promise<Metadata> {
  const params = await props.params
  const page = source.getPage(params.slug)

  if (!page) notFound()

  const description = page.data.description ?? METADATA.description

  return createMetadata(
    metadataImage.withImage(page.slugs, {
      title: page.data.title,
      description,
      openGraph: {
        url: `/docs/${page.slugs.join('/')}`,
      },
    })
  )
}

export function generateStaticParams(): { slug: string[] }[] {
  return source.generateParams()
}
