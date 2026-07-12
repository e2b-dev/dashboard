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
  deployerServiceAccountEmail: z.string().email().max(254),
  deploymentId: z.string().uuid().optional(),
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
  target: protectedTeamProcedure.query(({ ctx }) => {
    return createByocDeploymentsRepository({ teamId: ctx.teamId }).target()
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
        input.deploymentId
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
        connectionId: z.string().uuid(),
        projectId: z.string().min(1),
      })
    )
    .mutation(({ ctx, input }) => {
      return createByocDeploymentsRepository({
        teamId: ctx.teamId,
      }).createDeployment(input.connectionId, input.projectId)
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

  deploy: protectedTeamProcedure
    .input(deploymentIdInput.extend({ topology: topologyInput }))
    .mutation(({ ctx, input }) => {
      return createByocDeploymentsRepository({
        teamId: ctx.teamId,
      }).deploy(input.deploymentId, {
        api_node_count: input.topology.apiNodeCount,
        api_machine_type: input.topology.apiMachineType,
        client_node_count: input.topology.clientNodeCount,
        client_machine_type: input.topology.clientMachineType,
        clickhouse_node_count: input.topology.clickHouseNodeCount,
        clickhouse_machine_type: input.topology.clickHouseMachineType,
      })
    }),

  plan: protectedTeamProcedure
    .input(deploymentIdInput)
    .mutation(({ ctx, input }) => {
      return createByocDeploymentsRepository({
        teamId: ctx.teamId,
      }).plan(input.deploymentId)
    }),

  applyDeployment: protectedTeamProcedure
    .input(deploymentIdInput)
    .mutation(({ ctx, input }) => {
      return createByocDeploymentsRepository({
        teamId: ctx.teamId,
      }).apply(input.deploymentId)
    }),

  destroy: protectedTeamProcedure
    .input(deploymentIdInput)
    .mutation(({ ctx, input }) => {
      return createByocDeploymentsRepository({
        teamId: ctx.teamId,
      }).destroy(input.deploymentId)
    }),
})
