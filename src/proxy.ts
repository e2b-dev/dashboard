export { runDashboardProxy as proxy } from '@/core/server/proxy/runtime'

// Next.js statically parses the proxy `config` at build time, so the matcher
// must be an inline literal here — it can't be computed or re-exported from
// another module.
export const config = {
  matcher: [
    '/((?!_next/|.*\\.(?:ico|svg|png|jpg|jpeg|gif|webp)$|_vercel/|ingest/|ph-proxy/|array/|mintlify-assets/|_mintlify/).*)',
  ],
}
