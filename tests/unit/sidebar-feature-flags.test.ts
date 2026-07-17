import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SIDEBAR_MAIN_LINKS } from '@/configs/sidebar'
import {
  FeatureFlagsProvider,
  useFeatureFlags,
} from '@/core/modules/feature-flags/feature-flags.client'

function ByocVisibility() {
  const { hasPayload } = useFeatureFlags()
  return createElement(
    'span',
    null,
    hasPayload('byocSetup') ? 'shown' : 'hidden'
  )
}

function renderByocVisibility(value: unknown) {
  return renderToStaticMarkup(
    createElement(
      FeatureFlagsProvider,
      {
        initialFlags: [
          {
            id: 'byocSetup',
            key: 'byoc_setup',
            kind: 'payload',
            value,
            defaultValue: { enabled: false },
          },
        ],
      },
      createElement(ByocVisibility)
    )
  )
}

describe('BYOC sidebar payload', () => {
  it('uses the configured payload as the visibility gate', () => {
    expect(
      renderByocVisibility({
        enabled: true,
        principal:
          'serviceAccount:byoc-deployments-api@example-project.iam.gserviceaccount.com',
        regions: ['us-central1'],
        templates: {
          gcloud: 'gcloud --project={{PROJECT_ID}}',
          terraform: 'project_id = "{{PROJECT_ID}}"',
        },
      })
    ).toContain('shown')
    expect(renderByocVisibility({ enabled: false })).toContain('hidden')
  })

  it('keeps the BYOC navigation tied to the payload flag', () => {
    expect(
      SIDEBAR_MAIN_LINKS.find((link) => link.label === 'BYOC')?.featureFlag
    ).toBe('byocSetup')
  })
})
