import {
  CodeBlockProps,
  CodeBlock as DocsCodeBlock,
  Pre,
} from '@/ui/docs-code-block'
import { Tabs as DocsTabs, Tab, TabsProps } from '@/ui/docs-tabs'
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert'
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion'
import { TypeTable } from 'fumadocs-ui/components/type-table'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import { AlertCircle } from 'lucide-react'
import { MDXComponents } from 'mdx/types'
import { ComponentProps, forwardRef, Fragment } from 'react'

const Callout = forwardRef<
  HTMLDivElement,
  ComponentProps<(typeof defaultMdxComponents)['Callout']>
>(({ title, type, icon, children, ...props }, ref) => {
  const variant =
    type !== 'info' ? (type === 'warn' ? 'warning' : 'info') : 'info'

  return (
    <Alert ref={ref} variant={variant} className="ml-4 p-4">
      {icon ?? <AlertCircle className="h-4 w-4" />}
      {title && (title as string).length > 0 && (
        <AlertTitle>{title}</AlertTitle>
      )}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
})

Callout.displayName = 'Callout'

const Blockquote = forwardRef<HTMLQuoteElement, ComponentProps<'blockquote'>>(
  ({ children, ...props }, ref) => {
    return (
      <blockquote
        ref={ref}
        className="border-accent-info-highlight ml-4 border-l-[3px]"
        {...props}
      >
        {children}
      </blockquote>
    )
  }
)

Blockquote.displayName = 'Blockquote'

const CodeBlock = forwardRef<HTMLPreElement, CodeBlockProps>(
  ({ children, ...props }, ref) => {
    return (
      <DocsCodeBlock ref={ref} {...props}>
        <Pre>{children}</Pre>
      </DocsCodeBlock>
    )
  }
)

CodeBlock.displayName = 'CodeBlock'

const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  ({ children, ...props }, ref) => {
    return <DocsTabs {...props}>{children}</DocsTabs>
  }
)

Tabs.displayName = 'Tabs'

interface Props {
  slug: string[]
}

const components = ({
  slug,
}: Props): MDXComponents & typeof defaultMdxComponents => {
  return {
    ...defaultMdxComponents,
    Tabs,
    Tab,
    TypeTable,
    Accordion,
    Accordions,
    Callout,
    blockquote: Blockquote,
    code: CodeBlock,
    pre: (props) => <CodeBlock {...props} />,
    HeadlessOnly: slug[0] === 'headless' ? Fragment : () => undefined,
    UIOnly: slug[0] === 'ui' ? Fragment : () => undefined,
  }
}

export default components
