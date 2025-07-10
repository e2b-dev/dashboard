import {
  defineConfig,
  defineDocs,
  frontmatterSchema,
  metaSchema,
} from 'fumadocs-mdx/config'

export const docs = defineDocs({
  dir: 'src/content/docs',
  docs: { schema: frontmatterSchema },
  meta: { schema: metaSchema },
})

export default defineConfig({
  lastModifiedTime: 'git',
})

/* export default defineConfig({
  lastModifiedTime: 'git',
  mdxOptions: {
    rehypeCodeOptions: {
      lazy: true,
      experimentalJSEngine: true,
      langs: ['ts', 'js', 'html', 'tsx', 'mdx'],
      inline: 'tailing-curly-colon',
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        transformerTwoslash(),
        {
          name: 'transformers:remove-notation-escape',
          code(hast) {
            for (const line of hast.children) {
              if (line.type !== 'element') continue

              const lastSpan = line.children.findLast(
                (v) => v.type === 'element'
              )

              const head = lastSpan?.children[0]
              if (head?.type !== 'text') return

              head.value = head.value.replace(/\[\\!code/g, '[!code')
            }
          },
        },
      ],
    },
    remarkPlugins: [
      remarkMermaid,
      remarkMath,
      [remarkInstall, { persist: { id: 'package-manager' } }],
      [remarkDocGen, { generators: [fileGenerator()] }],
      remarkTypeScriptToJavaScript,
    ],
    rehypePlugins: (v) => [rehypeKatex, ...v],
  },
}) */
