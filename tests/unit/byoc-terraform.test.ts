import { describe, expect, it } from 'vitest'
import {
  isValidGcpProjectId,
  renderByocSetupTemplate,
} from '@/features/dashboard/byoc/terraform'

describe('BYOC setup templates', () => {
  it('substitutes only the selected values into flag-provided content', () => {
    const rendered = renderByocSetupTemplate({
      principal:
        'serviceAccount:byoc-deployments-api@example-project.iam.gserviceaccount.com',
      projectId: 'customer-project',
      region: 'us-west1',
      template:
        'project={{PROJECT_ID}} region={{REGION}} principal={{E2B_PRINCIPAL}}',
    })

    expect(rendered).toBe(
      'project=customer-project region=us-west1 principal=serviceAccount:byoc-deployments-api@example-project.iam.gserviceaccount.com'
    )
  })

  it('accepts only Google Cloud project IDs', () => {
    expect(isValidGcpProjectId('customer-project')).toBe(true)
    expect(isValidGcpProjectId('Customer Project')).toBe(false)
    expect(isValidGcpProjectId('x')).toBe(false)
    expect(isValidGcpProjectId('customer_project')).toBe(false)
  })
})
