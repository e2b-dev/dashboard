export { runDashboardProxy as proxy } from '@/core/server/proxy/runtime'

export const config = {
  matcher: [
    '/((?!_next/|.*\\.(?:ico|svg|png|jpg|jpeg|gif|webp)$|_vercel/|ingest/|ph-proxy/|array/|mintlify-assets/|_mintlify/).*)',
  ],
}
