'use client'

import { usePathname } from 'next/navigation'
import { ByocDeploymentPanel } from './byoc-deployment-panel'

export function ByocDeploymentRouteView() {
  const pathname = usePathname()
  const view = pathname.endsWith('/infrastructure')
    ? 'infrastructure'
    : 'configuration'

  return <ByocDeploymentPanel view={view} />
}
