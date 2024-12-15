import type { Metadata } from "next";
import {
  DocsPage,
  DocsBody,
  DocsTitle,
  DocsDescription,
  DocsCategory,
} from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import {
  type ComponentProps,
  type FC,
  Fragment,
  type ReactElement,
  type ReactNode,
} from "react";
import defaultComponents from "fumadocs-ui/mdx";
/* import { Popup, PopupContent, PopupTrigger } from "fumadocs-twoslash/ui"; */
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { Callout } from "fumadocs-ui/components/callout";
import { TypeTable } from "fumadocs-ui/components/type-table";
import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
/* import * as Preview from "@/components/preview"; */
import { source } from "@/app/source";
/* import { AutoTypeTable } from "@/components/type-table"; */
import { createMetadata, metadataImage } from "@/lib/metadata";

/* function PreviewRenderer({ preview }: { preview: string }): ReactNode {
  if (preview && preview in Preview) {
    const Comp = Preview[preview as keyof typeof Preview];
    return <Comp />;
  }

  return null;
} */

export default async function Page(props: {
  params: Promise<{ slug: string[] }>;
}): Promise<ReactElement> {
  const params = await props.params;

  const page = source.getPage(params.slug);

  if (!page) notFound();

  const path = `src/content/docs/${page.file.path}`;
  const preview = page.data.preview;
  const { body: Mdx, toc, lastModified } = await page.data.load();

  return (
    <DocsPage
      toc={toc}
      lastUpdate={lastModified}
      full={page.data.full}
      tableOfContent={{
        style: "clerk",
        single: false,
      }}
      editOnGithub={{
        repo: "dashboard",
        owner: "e2b-dev",
        sha: "main",
        path,
      }}
      article={{
        className: "max-sm:pb-16",
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody className="text-fg/80">
        {/*         {preview ? <PreviewRenderer preview={preview} /> : null} */}
        <Mdx
          components={{
            ...defaultComponents,
            /*             Popup,
            PopupContent,
            PopupTrigger, */
            Tabs,
            Tab,
            TypeTable,
            /*             AutoTypeTable, */
            Accordion,
            Accordions,
            /*             Wrapper, */
            blockquote: Callout as unknown as FC<ComponentProps<"blockquote">>,
            /*             APIPage: openapi.APIPage, */
            HeadlessOnly:
              params.slug[0] === "headless" ? Fragment : () => undefined,
            UIOnly: params.slug[0] === "ui" ? Fragment : () => undefined,
          }}
        />
        {page.data.index ? <DocsCategory page={page} from={source} /> : null}
      </DocsBody>
    </DocsPage>
  );
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);

  if (!page) notFound();

  const description =
    page.data.description ?? "The library for building documentation sites";

  return createMetadata(
    metadataImage.withImage(page.slugs, {
      title: page.data.title,
      description,
      openGraph: {
        url: `/docs/${page.slugs.join("/")}`,
      },
    })
  );
}

export function generateStaticParams(): { slug: string[] }[] {
  return source.generateParams();
}
