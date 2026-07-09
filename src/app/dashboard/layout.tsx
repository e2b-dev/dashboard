import { cookies } from 'next/headers'
import { COOKIE_KEYS } from '@/configs/cookies'
import { TimezoneProvider } from '@/features/dashboard/timezone/context'
import { parseTimezone } from '@/features/dashboard/timezone/utils'

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const timezone = parseTimezone(
    cookieStore.get(COOKIE_KEYS.DASHBOARD_TIMEZONE)?.value
  )

  return (
    <TimezoneProvider initialTimezone={timezone}>{children}</TimezoneProvider>
  )
}
