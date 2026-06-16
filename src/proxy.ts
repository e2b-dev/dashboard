export { runDashboardProxy as proxy } from '@/core/server/proxy/runtime'

// Next.js statically parses the proxy `config` at build time, so it must be an
// inline literal here — it can't be re-exported from another module. Keep the
// matcher in sync with `proxyConfig` in core/server/proxy/runtime.ts.
export const config = {
  matcher: [
    '/((?!_next/|.*\\.(?:ico|svg|png|jpg|jpeg|gif|webp)$|_vercel/|ingest/|ph-proxy/|array/|mintlify-assets/|_mintlify/).*)',
  ],
}
