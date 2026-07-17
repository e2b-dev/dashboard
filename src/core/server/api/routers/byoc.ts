import { z } from 'zod'
import { createByocDeploymentsRepository } from '@/core/modules/byoc-deployments/repository.server'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { protectedTeamProcedure } from '@/core/server/trpc/procedures'

const deploymentIdInput = z.object({
  deploymentId: z.string().uuid(),
})

const connectionIdInput = z.object({
  connectionId: z.string().uuid(),
})

const providerLocationInput = z.discriminatedUnion('provider', [
  z.object({
    provider: z.literal('gcp'),
    region: z.string().min(1),
    zone: z.string().min(1),
  }),
  z.object({
    provider: z.literal('aws'),
    region: z.string().min(1),
  }),
])

const legacyGcpLocationInput = z.object({
  region: z.string().min(1),
  zone: z.string().min(1),
})

const locationInput = z
  .union([providerLocationInput, legacyGcpLocationInput])
  .transform((location) =>
    'provider' in location
      ? location
      : { provider: 'gcp' as const, ...location }
  )

const createCloudConnectionInput = z.object({
  clientRequestId: z.string().uuid(),
  deployerServiceAccountEmail: z.union([
    z.string().email().max(254),
    z
      .string()
      .max(2048)
      .regex(/^arn:aws:iam::[0-9]{12}:role\/.+$/),
  ]),
  deploymentId: z.string().uuid().optional(),
  expectedCloudConnectionId: z.string().uuid().optional(),
  location: locationInput.optional(),
})

const optionalLocationInput = z.union([
  locationInput,
  z.object({
    provider: z.undefined().optional(),
    region: z.undefined().optional(),
    zone: z.undefined().optional(),
  }),
])

const topologyInput = z.object({
  apiNodeCount: z.number().int().min(1).max(20),
  apiMachineType: z
    .string()
    .regex(/^[a-z0-9.-]+$/)
    .max(64),
  clientNodeCount: z.number().int().min(1).max(100),
  clientMachineType: z
    .string()
    .regex(/^[a-z0-9.-]+$/)
    .max(64),
  clickHouseNodeCount: z.number().int().min(1).max(10),
  clickHouseMachineType: z
    .string()
    .regex(/^[a-z0-9.-]+$/)
    .max(64),
})

type ByocRepository = ReturnType<typeof createByocDeploymentsRepository>
type InitialDeploymentInput = {
  connectionId: string
  deploymentClientRequestId: string
  operationClientRequestId: string
  projectId: string
  topology: z.infer<typeof topologyInput>
}

export async function createInitialDeployment(
  repository: Pick<ByocRepository, 'createDeployment' | 'deploy'>,
  input: InitialDeploymentInput
) {
  const deployment = await repository.createDeployment(
    input.connectionId,
    input.projectId,
    input.deploymentClientRequestId
  )
  const operation = await repository.deploy(
    deployment.id,
    {
      api_node_count: input.topology.apiNodeCount,
      api_machine_type: input.topology.apiMachineType,
      client_node_count: input.topology.clientNodeCount,
      client_machine_type: input.topology.clientMachineType,
      clickhouse_node_count: input.topology.clickHouseNodeCount,
      clickhouse_machine_type: input.topology.clickHouseMachineType,
    },
    input.operationClientRequestId
  )
  return { deployment, operation }
}

export const byocRouter = createTRPCRouter({
  locations: protectedTeamProcedure.query(({ ctx }) =>
    createByocDeploymentsRepository({ teamId: ctx.teamId }).locations()
  ),

  allocatedTarget: protectedTeamProcedure.query(({ ctx }) =>
    createByocDeploymentsRepository({ teamId: ctx.teamId }).allocatedTarget()
  ),

  resetTarget: protectedTeamProcedure
    .input(
      z.object({ expectedTargetKey: z.string().regex(/^[a-z][a-z0-9]{11}$/) })
    )
    .mutation(({ ctx, input }) =>
      createByocDeploymentsRepository({ teamId: ctx.teamId }).resetTarget(
        input.expectedTargetKey
      )
    ),

  updateTargetLocation: protectedTeamProcedure
    .input(
      z.object({
        expectedLocation: locationInput,
        location: locationInput,
      })
    )
    .mutation(({ ctx, input }) =>
      createByocDeploymentsRepository({
        teamId: ctx.teamId,
      }).updateTargetLocation(input.expectedLocation, input.location)
    ),

  allocateTarget: protectedTeamProcedure
    .input(locationInput)
    .mutation(({ ctx, input }) =>
      createByocDeploymentsRepository({ teamId: ctx.teamId }).target(input)
    ),

  target: protectedTeamProcedure
    .input(optionalLocationInput)
    .query(({ ctx, input }) => {
      const repository = createByocDeploymentsRepository({ teamId: ctx.teamId })
      return input.region ? repository.target(input) : repository.target()
    }),

  health: protectedTeamProcedure.query(({ ctx }) => {
    return createByocDeploymentsRepository({ teamId: ctx.teamId }).health()
  }),

  createCloudConnection: protectedTeamProcedure
    .input(createCloudConnectionInput)
    .mutation(({ ctx, input }) => {
      return createByocDeploymentsRepository({
        teamId: ctx.teamId,
      }).createCloudConnection(
        input.deployerServiceAccountEmail,
        input.deploymentId,
        input.clientRequestId,
        input.expectedCloudConnectionId,
        input.location
      )
    }),

  listCloudConnections: protectedTeamProcedure.query(({ ctx }) => {
    return createByocDeploymentsRepository({
      teamId: ctx.teamId,
    }).listCloudConnections()
  }),

  listProjects: protectedTeamProcedure
    .input(connectionIdInput)
    .query(({ ctx, input }) => {
      return createByocDeploymentsRepository({
        teamId: ctx.teamId,
      }).listProjects(input.connectionId)
    }),

  createDeployment: protectedTeamProcedure
    .input(
      z.object({
        clientRequestId: z.string().uuid(),
        connectionId: z.string().uuid(),
        projectId: z.string().min(1),
      })
    )
    .mutation(({ ctx, input }) => {
      return createByocDeploymentsRepository({
        teamId: ctx.teamId,
      }).createDeployment(
        input.connectionId,
        input.projectId,
        input.clientRequestId
      )
    }),

  createDeploymentAndDeploy: protectedTeamProcedure
    .input(
      z.object({
        connectionId: z.string().uuid(),
        deploymentClientRequestId: z.string().uuid(),
        operationClientRequestId: z.string().uuid(),
        projectId: z.string().min(1),
        topology: topologyInput,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const repository = createByocDeploymentsRepository({
        teamId: ctx.teamId,
      })
      return createInitialDeployment(repository, input)
    }),

  listDeployments: protectedTeamProcedure.query(({ ctx }) => {
    return createByocDeploymentsRepository({
      teamId: ctx.teamId,
    }).listDeployments()
  }),

  getDeployment: protectedTeamProcedure
    .input(deploymentIdInput)
    .query(({ ctx, input }) => {
      return createByocDeploymentsRepository({
        teamId: ctx.teamId,
      }).getDeployment(input.deploymentId)
    }),

  listEvents: protectedTeamProcedure
    .input(deploymentIdInput)
    .query(({ ctx, input }) => {
      return createByocDeploymentsRepository({
        teamId: ctx.teamId,
      }).listEvents(input.deploymentId)
    }),

  listOperations: protectedTeamProcedure
    .input(deploymentIdInput)
    .query(({ ctx, input }) => {
      return createByocDeploymentsRepository({
        teamId: ctx.teamId,
      }).listOperations(input.deploymentId)
    }),

  deploy: protectedTeamProcedure
    .input(
      deploymentIdInput.extend({
        clientRequestId: z.string().uuid(),
        topology: topologyInput,
      })
    )
    .mutation(({ ctx, input }) => {
      return createByocDeploymentsRepository({
        teamId: ctx.teamId,
      }).deploy(
        input.deploymentId,
        {
          api_node_count: input.topology.apiNodeCount,
          api_machine_type: input.topology.apiMachineType,
          client_node_count: input.topology.clientNodeCount,
          client_machine_type: input.topology.clientMachineType,
          clickhouse_node_count: input.topology.clickHouseNodeCount,
          clickhouse_machine_type: input.topology.clickHouseMachineType,
        },
        input.clientRequestId
      )
    }),

  validate: protectedTeamProcedure
    .input(deploymentIdInput.extend({ clientRequestId: z.string().uuid() }))
    .mutation(({ ctx, input }) => {
      return createByocDeploymentsRepository({
        teamId: ctx.teamId,
      }).validate(input.deploymentId, input.clientRequestId)
    }),

  destroy: protectedTeamProcedure
    .input(deploymentIdInput.extend({ clientRequestId: z.string().uuid() }))
    .mutation(({ ctx, input }) => {
      return createByocDeploymentsRepository({
        teamId: ctx.teamId,
      }).destroy(input.deploymentId, input.clientRequestId)
    }),
})
