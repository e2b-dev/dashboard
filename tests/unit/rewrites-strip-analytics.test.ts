import { describe, expect, it } from 'vitest'
import { rewriteContentPagesHtml } from '@/lib/utils/rewrites'

const FIXTURE_HTML = `<!doctype html>
<html>
<head>
  <title>Landing</title>
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});})(window,document,'script','dataLayer','GTM-K2W3LVD2');</script>
  <script>!function(t,e){window.posthog=e;e.init('phc_x',{api_host:'https://us.posthog.com'})}(document,window.posthog||[]);</script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123"></script>
  <script>gtag('js', new Date()); gtag('config', 'G-ABC123');</script>
  <script src="https://snap.licdn.com/li.lms-analytics/insight.min.js"></script>
  <script src="https://cdn.prod.website-files.com/site/js/app.js"></script>
  <script>console.log('page bootstrap, not analytics');</script>
</head>
<body>
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-K2W3LVD2"></iframe></noscript>
  <a href="https://e2b.dev/pricing">Pricing</a>
</body>
</html>`

const seo = { pathname: '/', allowIndexing: false }

describe('rewriteContentPagesHtml — stripAnalytics', () => {
  it('removes every analytics vendor when stripAnalytics is true', () => {
    const out = rewriteContentPagesHtml(FIXTURE_HTML, {
      seo,
      stripAnalytics: true,
    })

    expect(out).not.toContain('gtm.start')
    expect(out).not.toContain('GTM-K2W3LVD2')
    expect(out).not.toContain('googletagmanager.com')
    expect(out).not.toContain('posthog')
    expect(out).not.toContain('gtag(')
    expect(out).not.toContain('snap.licdn.com')
  })

  it('keeps non-analytics scripts and page markup when stripping', () => {
    const out = rewriteContentPagesHtml(FIXTURE_HTML, {
      seo,
      hrefPrefixes: ['https://e2b.dev'],
      stripAnalytics: true,
    })

    expect(out).toContain('cdn.prod.website-files.com/site/js/app.js')
    expect(out).toContain('page bootstrap, not analytics')
    expect(out).toContain('href="/pricing"')
  })

  it('leaves analytics tags intact when stripAnalytics is falsy (production)', () => {
    const out = rewriteContentPagesHtml(FIXTURE_HTML, {
      seo,
      stripAnalytics: false,
    })

    expect(out).toContain('GTM-K2W3LVD2')
    expect(out).toContain('posthog')
    expect(out).toContain('snap.licdn.com')
    expect(out).toContain('www.googletagmanager.com/ns.html')
  })
})
