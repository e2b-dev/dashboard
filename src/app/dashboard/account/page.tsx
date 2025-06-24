import DashboardPageLayout from '@/features/dashboard/page-layout'
import { NameSettings } from '@/features/dashboard/account/name-settings'
import { EmailSettings } from '@/features/dashboard/account/email-settings'
import { PasswordSettings } from '@/features/dashboard/account/password-settings'
import { Suspense } from 'react'
import { AccessTokenSettings } from '@/features/dashboard/account/access-token-settings'

export default async function AccountPage() {
  return (
    <DashboardPageLayout
      hideFrame
      title="Account"
      className="flex flex-col gap-6"
    >
      <Suspense fallback={null}>
        <NameSettings />
      </Suspense>

      <Suspense fallback={null}>
        <EmailSettings />
      </Suspense>

      <Suspense fallback={null}>
        <AccessTokenSettings />
      </Suspense>

      <Suspense fallback={null}>
        <PasswordSettings />
      </Suspense>
    </DashboardPageLayout>
  )
}
