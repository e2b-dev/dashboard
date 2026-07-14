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

const createCloudConnectionInput = z.object({
  clientRequestId: z.string().uuid(),
  deployerServiceAccountEmail: z.string().email().max(254),
  deploymentId: z.string().uuid().optional(),
  expectedCloudConnectionId: z.string().uuid().optional(),
  location: z
    .object({
      region: z.string().min(1),
      zone: z.string().min(1),
    })
    .optional(),
})

const optionalLocationInput = z
  .object({
    region: z.string().min(1).optional(),
    zone: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.region) === Boolean(value.zone), {
    message: 'Region and zone must be selected together.',
  })

const locationInput = z.object({
  region: z.string().min(1),
  zone: z.string().min(1),
})

const topologyInput = z.object({
  apiNodeCount: z.number().int().min(1).max(20),
  apiMachineType: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(64),
  clientNodeCount: z.number().int().min(1).max(100),
  clientMachineType: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(64),
  clickHouseNodeCount: z.number().int().min(1).max(10),
  clickHouseMachineType: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(64),
})

export const byocRouter = createTRPCRouter({
  locations: protectedTeamProcedure.query(({ ctx }) =>
    createByocDeploymentsRepository({ teamId: ctx.teamId }).locations()
  ),

  allocatedTarget: protectedTeamProcedure.query(({ ctx }) =>
    createByocDeploymentsRepository({ teamId: ctx.teamId }).allocatedTarget()
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
    .input(
      z.object({
        region: z.string().min(1),
        zone: z.string().min(1),
      })
    )
    .mutation(({ ctx, input }) =>
      createByocDeploymentsRepository({ teamId: ctx.teamId }).target(input)
    ),

  target: protectedTeamProcedure
    .input(optionalLocationInput)
    .query(({ ctx, input }) =>
      createByocDeploymentsRepository({ teamId: ctx.teamId }).target(
        input.region && input.zone
          ? { region: input.region, zone: input.zone }
          : undefined
      )
    ),

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
