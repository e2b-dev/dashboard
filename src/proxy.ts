export { runDashboardProxy as proxy } from '@/core/server/proxy/runtime'

export const config = {
  matcher: [
    '/((?!_next/|api/|.*\\.(?:ico|svg|png|jpg|jpeg|gif|webp)$|_vercel/).*)',
  ],
}
