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

export const byocRouter = createTRPCRouter({
  target: protectedTeamProcedure.query(({ ctx }) => {
    return createByocDeploymentsRepository({ teamId: ctx.teamId }).target()
  }),

  health: protectedTeamProcedure.query(({ ctx }) => {
    return createByocDeploymentsRepository({ teamId: ctx.teamId }).health()
  }),

  createCloudConnection: protectedTeamProcedure.mutation(({ ctx }) => {
    return createByocDeploymentsRepository({
      teamId: ctx.teamId,
    }).createCloudConnection()
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
    .input(deploymentIdInput)
    .mutation(({ ctx, input }) => {
      return createByocDeploymentsRepository({
        teamId: ctx.teamId,
      }).deploy(input.deploymentId)
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
