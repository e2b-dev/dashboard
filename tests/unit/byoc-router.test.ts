import { describe, expect, it, vi } from 'vitest'
import { createInitialDeployment } from '@/core/server/api/routers/byoc'

describe('createInitialDeployment', () => {
  it('creates the draft before enqueueing deploy with stable request IDs and topology', async () => {
    const deployment = { id: 'deployment-1' }
    const operation = { id: 'operation-1' }
    const createDeployment = vi.fn().mockResolvedValue(deployment)
    const deploy = vi.fn().mockResolvedValue(operation)

    await expect(
      createInitialDeployment(
        { createDeployment, deploy } as Parameters<
          typeof createInitialDeployment
        >[0],
        {
          connectionId: 'connection-1',
          deploymentClientRequestId: 'deployment-request-1',
          operationClientRequestId: 'operation-request-1',
          projectId: 'project-1',
          topology: {
            apiNodeCount: 2,
            apiMachineType: 't3.xlarge',
            clientNodeCount: 3,
            clientMachineType: 'm8i.4xlarge',
            clickHouseNodeCount: 1,
            clickHouseMachineType: 't3.xlarge',
          },
        }
      )
    ).resolves.toEqual({ deployment, operation })

    expect(createDeployment).toHaveBeenCalledWith(
      'connection-1',
      'project-1',
      'deployment-request-1'
    )
    expect(deploy).toHaveBeenCalledWith(
      'deployment-1',
      {
        api_node_count: 2,
        api_machine_type: 't3.xlarge',
        client_node_count: 3,
        client_machine_type: 'm8i.4xlarge',
        clickhouse_node_count: 1,
        clickhouse_machine_type: 't3.xlarge',
      },
      'operation-request-1'
    )
    expect(createDeployment.mock.invocationCallOrder[0]).toBeLessThan(
      deploy.mock.invocationCallOrder[0]
    )
  })

  it('does not enqueue deploy when draft creation fails', async () => {
    const createDeployment = vi.fn().mockRejectedValue(new Error('failed'))
    const deploy = vi.fn()

    await expect(
      createInitialDeployment(
        { createDeployment, deploy } as Parameters<
          typeof createInitialDeployment
        >[0],
        {
          connectionId: 'connection-1',
          deploymentClientRequestId: 'deployment-request-1',
          operationClientRequestId: 'operation-request-1',
          projectId: 'project-1',
          topology: {
            apiNodeCount: 1,
            apiMachineType: 't3.xlarge',
            clientNodeCount: 1,
            clientMachineType: 'm8i.4xlarge',
            clickHouseNodeCount: 1,
            clickHouseMachineType: 't3.xlarge',
          },
        }
      )
    ).rejects.toThrow('failed')
    expect(deploy).not.toHaveBeenCalled()
  })

  it('replays both idempotent requests when enqueue fails after draft creation', async () => {
    const deployment = { id: 'deployment-1' }
    const operation = { id: 'operation-1' }
    const createDeployment = vi.fn().mockResolvedValue(deployment)
    const deploy = vi
      .fn()
      .mockRejectedValueOnce(new Error('unavailable'))
      .mockResolvedValueOnce(operation)
    const repository = { createDeployment, deploy } as Parameters<
      typeof createInitialDeployment
    >[0]
    const input: Parameters<typeof createInitialDeployment>[1] = {
      connectionId: 'connection-1',
      deploymentClientRequestId: 'deployment-request-1',
      operationClientRequestId: 'operation-request-1',
      projectId: 'project-1',
      topology: {
        apiNodeCount: 1,
        apiMachineType: 't3.xlarge',
        clientNodeCount: 1,
        clientMachineType: 'm8i.4xlarge',
        clickHouseNodeCount: 1,
        clickHouseMachineType: 't3.xlarge',
      },
    }

    await expect(createInitialDeployment(repository, input)).rejects.toThrow(
      'unavailable'
    )
    await expect(createInitialDeployment(repository, input)).resolves.toEqual({
      deployment,
      operation,
    })

    expect(createDeployment).toHaveBeenNthCalledWith(
      1,
      'connection-1',
      'project-1',
      'deployment-request-1'
    )
    expect(createDeployment).toHaveBeenNthCalledWith(
      2,
      'connection-1',
      'project-1',
      'deployment-request-1'
    )
    expect(deploy).toHaveBeenNthCalledWith(
      1,
      'deployment-1',
      expect.any(Object),
      'operation-request-1'
    )
    expect(deploy).toHaveBeenNthCalledWith(
      2,
      'deployment-1',
      expect.any(Object),
      'operation-request-1'
    )
  })
})
