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
  target: protectedTeamProcedure.query(({ input }) => {
    return createByocDeploymentsRepository({ teamId: input.teamSlug }).target()
  }),

  health: protectedTeamProcedure.query(({ input }) => {
    return createByocDeploymentsRepository({ teamId: input.teamSlug }).health()
  }),

  createCloudConnection: protectedTeamProcedure.mutation(({ input }) => {
    return createByocDeploymentsRepository({
      teamId: input.teamSlug,
    }).createCloudConnection()
  }),

  listCloudConnections: protectedTeamProcedure.query(({ input }) => {
    return createByocDeploymentsRepository({
      teamId: input.teamSlug,
    }).listCloudConnections()
  }),

  listProjects: protectedTeamProcedure
    .input(connectionIdInput)
    .query(({ input }) => {
      return createByocDeploymentsRepository({
        teamId: input.teamSlug,
      }).listProjects(input.connectionId)
    }),

  createDeployment: protectedTeamProcedure
    .input(
      z.object({
        connectionId: z.string().uuid(),
        projectId: z.literal('e2b-dev-matt'),
      })
    )
    .mutation(({ input }) => {
      return createByocDeploymentsRepository({
        teamId: input.teamSlug,
      }).createDeployment(input.connectionId, input.projectId)
    }),

  listDeployments: protectedTeamProcedure.query(({ input }) => {
    return createByocDeploymentsRepository({
      teamId: input.teamSlug,
    }).listDeployments()
  }),

  getDeployment: protectedTeamProcedure
    .input(deploymentIdInput)
    .query(({ input }) => {
      return createByocDeploymentsRepository({
        teamId: input.teamSlug,
      }).getDeployment(input.deploymentId)
    }),

  listEvents: protectedTeamProcedure
    .input(deploymentIdInput)
    .query(({ input }) => {
      return createByocDeploymentsRepository({
        teamId: input.teamSlug,
      }).listEvents(input.deploymentId)
    }),

  deploy: protectedTeamProcedure
    .input(deploymentIdInput)
    .mutation(({ input }) => {
      return createByocDeploymentsRepository({
        teamId: input.teamSlug,
      }).deploy(input.deploymentId)
    }),

  plan: protectedTeamProcedure
    .input(deploymentIdInput)
    .mutation(({ input }) => {
      return createByocDeploymentsRepository({
        teamId: input.teamSlug,
      }).plan(input.deploymentId)
    }),

  applyDeployment: protectedTeamProcedure
    .input(deploymentIdInput)
    .mutation(({ input }) => {
      return createByocDeploymentsRepository({
        teamId: input.teamSlug,
      }).apply(input.deploymentId)
    }),

  destroy: protectedTeamProcedure
    .input(deploymentIdInput)
    .mutation(({ input }) => {
      return createByocDeploymentsRepository({
        teamId: input.teamSlug,
      }).destroy(input.deploymentId)
    }),
})
