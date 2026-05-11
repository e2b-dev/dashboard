import { FilesystemEventType, type Sandbox } from 'e2b'
import { describe, expect, it, vi } from 'vitest'
import { createFilesystemStore } from '@/features/dashboard/sandbox/inspect/filesystem/store'
import { SandboxManager } from '@/features/dashboard/sandbox/inspect/sandbox-manager'

function waitForPendingWork() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function createStore() {
  const store = createFilesystemStore('/home/user')
  store.getState().addNodes('/home', [
    {
      name: 'user',
      path: '/home/user',
      type: 'dir',
      isExpanded: true,
      children: [],
    },
  ])

  return store
}

describe('SandboxManager E2B SDK surface', () => {
  it('uses the E2B filesystem methods required by the dashboard inspector', async () => {
    let watcherCallback:
      | ((event: { type: FilesystemEventType; name: string }) => void)
      | undefined

    const watchHandle = { stop: vi.fn() }
    const sandbox = {
      files: {
        watchDir: vi.fn(async (_path, callback) => {
          watcherCallback = callback
          return watchHandle
        }),
        list: vi.fn(async () => [
          {
            type: 'file',
            name: 'hello.txt',
            path: '/home/user/hello.txt',
          },
        ]),
        getInfo: vi.fn(async () => ({ size: 11 })),
        read: vi.fn(
          async () => new Blob(['hello world'], { type: 'text/plain' })
        ),
      },
      downloadUrl: vi.fn(async () => 'https://download.example/hello.txt'),
    } as unknown as Sandbox

    const store = createStore()
    const manager = new SandboxManager(store, sandbox, '/home/user')

    await waitForPendingWork()

    expect(sandbox.files.watchDir).toHaveBeenCalledWith(
      '/home/user',
      expect.any(Function),
      expect.objectContaining({
        recursive: true,
        user: 'root',
        timeoutMs: 0,
        requestTimeoutMs: 0,
      })
    )

    await manager.loadDirectory('/home/user')

    expect(sandbox.files.list).toHaveBeenCalledWith(
      '/home/user',
      expect.objectContaining({
        user: 'root',
        requestTimeoutMs: 20_000,
      })
    )
    expect(store.getState().getNode('/home/user/hello.txt')).toMatchObject({
      type: 'file',
      name: 'hello.txt',
    })

    await manager.readFile('/home/user/hello.txt')

    expect(sandbox.files.getInfo).toHaveBeenCalledWith(
      '/home/user/hello.txt',
      expect.objectContaining({
        user: 'root',
        requestTimeoutMs: 10_000,
      })
    )
    expect(sandbox.files.read).toHaveBeenCalledWith(
      '/home/user/hello.txt',
      expect.objectContaining({
        format: 'blob',
        user: 'root',
        requestTimeoutMs: 30_000,
      })
    )
    expect(
      store.getState().getFileContent('/home/user/hello.txt')
    ).toMatchObject({
      type: 'text',
      text: 'hello world',
    })

    await expect(manager.getDownloadUrl('/home/user/hello.txt')).resolves.toBe(
      'https://download.example/hello.txt'
    )
    expect(sandbox.downloadUrl).toHaveBeenCalledWith('/home/user/hello.txt', {
      user: 'root',
    })

    watcherCallback?.({
      type: FilesystemEventType.REMOVE,
      name: 'hello.txt',
    })

    expect(store.getState().getNode('/home/user/hello.txt')).toBeUndefined()

    manager.stopWatching()
    expect(watchHandle.stop).toHaveBeenCalled()
  })
})
