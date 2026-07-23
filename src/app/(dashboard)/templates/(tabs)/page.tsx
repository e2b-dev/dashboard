import { redirect } from 'next/navigation'
import { PROTECTED_URLS } from '@/configs/urls'

export default async function TemplatesTabsPage() {
  redirect(PROTECTED_URLS.TEMPLATES_LIST)
}
