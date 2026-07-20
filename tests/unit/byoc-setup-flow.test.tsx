import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  ByocSetupFlow,
  reviewedPlanMatchesRelease,
  shouldShowByocSetupFlow,
} from '@/features/dashboard/byoc/byoc-deployment-panel'

type SetupFlowProps = Parameters<typeof ByocSetupFlow>[0]

function setupFlowProps(
  overrides: Partial<SetupFlowProps> = {}
): SetupFlowProps {
  return {
    bootstrapPending: false,
    canCreateDeployment: false,
    canDeploy: false,
    createConnectionFailureCount: 0,
    createConnectionPending: false,
    createDeploymentPending: false,
    deployerAccountId: '',
    deployerServiceAccountEmail: '',
    deploymentEvents: [],
    e2bPrincipals: [],
    locations: [
      {
        provider: 'gcp',
        region: 'us-central1',
        zone: 'us-central1-a',
      },
    ] as SetupFlowProps['locations'],
    onCancelOperation: () => undefined,
    onConnect: () => undefined,
    onCreateDeployment: () => undefined,
    onDeploy: () => undefined,
    onDestroy: () => undefined,
    onGenerateIdentity: () => undefined,
    onLocationChange: () => undefined,
    onProviderChange: () => undefined,
    onRefresh: () => undefined,
    onResetTarget: () => undefined,
    onRetryOperation: () => undefined,
    onSetupProjectIdChange: () => undefined,
    onSetupStart: () => undefined,
    onValidate: () => undefined,
    operationControlPending: false,
    operationPending: false,
    projectId: '',
    setupStarted: true,
    targetPending: false,
    targetResetLocked: false,
    topology: {
      apiNodeCount: 1,
      apiMachineType: 'n2-standard-4',
      clientNodeCount: 1,
      clientMachineType: 'n2-standard-4',
      clickHouseNodeCount: 0,
      clickHouseMachineType: 'n2-standard-4',
    },
    updateTopology: () => undefined,
    ...overrides,
  }
}

describe('BYOC setup flow boundaries', () => {
  it('keeps attached deployments on the main view while an upgrade plan runs', () => {
    expect(
      shouldShowByocSetupFlow({
        hasTarget: true,
        hasAttachedRoute: true,
        phase: 'configuration',
      })
    ).toBe(false)
    expect(
      shouldShowByocSetupFlow({
        hasTarget: true,
        hasAttachedRoute: true,
        phase: 'terraform_plan',
      })
    ).toBe(false)
  })

  it('requires the reviewed plan to match the release manifest', () => {
    const deployment = {
      terraform_plan_operation_id: 'plan-1',
      terraform_plan_release_id: 'release-1',
      terraform_plan_manifest_digest: 'sha256:old',
    }

    expect(
      reviewedPlanMatchesRelease(deployment, {
        id: 'release-1',
        manifest_digest: 'sha256:old',
      })
    ).toBe(true)
    expect(
      reviewedPlanMatchesRelease(deployment, {
        id: 'release-1',
        manifest_digest: 'sha256:new',
      })
    ).toBe(false)
  })

  it('asks only for cloud and region before target allocation', () => {
    const html = renderToStaticMarkup(<ByocSetupFlow {...setupFlowProps()} />)

    expect(html).toContain('1. Choose cloud and region')
    expect(html).toContain('Cloud')
    expect(html).toContain('Region')
    expect(html).not.toContain('Cloud account')
    expect(html).not.toContain('service account')
    expect(html).not.toContain('AWS account ID')
  })

  it('keeps backend-enabled cancellation available during an active operation', () => {
    const html = renderToStaticMarkup(
      <ByocSetupFlow
        {...setupFlowProps({
          operationPending: true,
          target: {} as SetupFlowProps['target'],
          view: {
            version: 2,
            phase: 'infrastructure',
            status: 'in_progress',
            title: 'Deploying infrastructure',
            description: 'Terraform is applying the selected configuration.',
            steps: [],
            actions: [
              {
                id: 'cancel_operation',
                label: 'Cancel',
                enabled: true,
                operation_id: '55555555-5555-4555-8555-555555555555',
              },
            ],
          },
        })}
      />
    )

    expect(html).toContain('>Cancel</button>')
    expect(html).not.toContain('disabled=""')
  })

  it.each([
    { name: 'omitted', action: undefined, disabled: true },
    {
      name: 'disabled',
      action: {
        id: 'connect_cloud',
        label: 'Verify cloud access',
        enabled: false,
        kind: 'primary' as const,
      },
      disabled: true,
    },
    {
      name: 'enabled',
      action: {
        id: 'connect_cloud',
        label: 'Verify cloud access',
        enabled: true,
        kind: 'primary' as const,
      },
      disabled: false,
    },
  ])('honors a $name backend cloud-access action', ({ action, disabled }) => {
    const html = renderToStaticMarkup(
      <ByocSetupFlow
        {...setupFlowProps({
          bootstrapBundle: {
            artifacts: [
              {
                id: 'terraform',
                label: 'Terraform',
                language: 'hcl',
                content: 'terraform {}',
              },
            ],
          } as SetupFlowProps['bootstrapBundle'],
          deployerAccountId: 'byoc-deployer',
          deployerServiceAccountEmail:
            'byoc-deployer@example-project.iam.gserviceaccount.com',
          e2bPrincipals: [
            'serviceAccount:worker@example.iam.gserviceaccount.com',
          ],
          location: {
            provider: 'gcp',
            region: 'us-central1',
            zone: 'us-central1-a',
          } as SetupFlowProps['location'],
          projectId: 'example-project',
          provider: 'gcp',
          target: {} as SetupFlowProps['target'],
          targetResetLocked: true,
          view: {
            version: 2,
            phase: 'cloud_access',
            status: 'action_required',
            title: 'Connect your cloud account',
            description: 'Create and verify the scoped deployer identity.',
            steps: [],
            actions: action ? [action] : [],
          },
        })}
      />
    )
    const button = html.match(
      /<button[^>]*>Verify cloud access<svg|<button[^>]*>Verify and continue<svg/
    )?.[0]

    expect(button).toBeDefined()
    expect(button?.includes('disabled=""')).toBe(disabled)
  })
})
