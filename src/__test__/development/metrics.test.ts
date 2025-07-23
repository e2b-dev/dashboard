import { describe, it, expect } from 'vitest'
import { Sandbox } from 'e2b'

// Ensure required environment variables exist
const { TEST_E2B_DOMAIN, TEST_E2B_API_KEY } = import.meta.env

if (!TEST_E2B_DOMAIN || !TEST_E2B_API_KEY) {
  throw new Error(
    'Missing environment variables: TEST_E2B_DOMAIN and/or TEST_E2B_API_KEY'
  )
}

const SPAWN_COUNT = 50 // total sandboxes to spawn
const BATCH_SIZE = 5 // how many sandboxes to spawn concurrently

const SBX_TIMEOUT_MS = 60_000
const STRESS_TIMEOUT_MS = 60_000
const TEMPLATE = process.env.TEST_METRICS_TEMPLATE ?? 'base'

const MEMORY_MB = 1024 // allocate this much memory inside sandbox in MB
const CPU_OPS = 100_000_000 // iterations of CPU intensive math

function buildStressCode(memoryMb: number, cpuOps: number): string {
  return `
cat > stress.py << 'EOL'
import time, math, random, os, sys

mem_mb = ${memoryMb}
cpu_ops = ${cpuOps}

start = time.time()

chunk = bytearray(mem_mb * 1024 * 1024)

for i in range(0, len(chunk), 4096):
    chunk[i] = 1

total = 0.0
for _ in range(cpu_ops):
    total += math.sin(random.random())

duration = time.time() - start
print(f"STRESS_DONE duration={duration} total={total}")
EOL

python3 stress.py
`
}

describe('E2B Sandbox metrics', () => {
  it(
    `spawns ${SPAWN_COUNT} sandbox(es) using template "${TEMPLATE}"`,
    { timeout: 60_000 },
    async () => {
      const sandboxes: Sandbox[] = []

      const start = Date.now()

      const spawnBatch = async (count: number) => {
        const batch = await Promise.all(
          Array.from({ length: count }).map(() =>
            Sandbox.create(TEMPLATE, {
              domain: TEST_E2B_DOMAIN as string,
              apiKey: TEST_E2B_API_KEY as string,
              timeoutMs: SBX_TIMEOUT_MS,
            })
          )
        )
        sandboxes.push(...batch)
        await new Promise((resolve) => setTimeout(resolve, 1_000))
      }

      for (let spawned = 0; spawned < SPAWN_COUNT; spawned += BATCH_SIZE) {
        const remaining = SPAWN_COUNT - spawned
        const currentBatchSize = Math.min(remaining, BATCH_SIZE)
        await spawnBatch(currentBatchSize)
      }

      const durationMs = Date.now() - start
      console.info(
        `Spawned ${SPAWN_COUNT} sandbox(es) in ${durationMs}ms (batch size: ${BATCH_SIZE})`
      )

      const stressCode = buildStressCode(MEMORY_MB, CPU_OPS)

      const runStressCode = async () => {
        try {
          // Execute stress code inside each sandbox
          await Promise.all(
            sandboxes.map((sbx) =>
              sbx.commands.run(stressCode, {
                timeoutMs: STRESS_TIMEOUT_MS,
              })
            )
          )
        } catch (error) {
          console.error(error)
        }
      }

      runStressCode()

      expect(sandboxes.length).toBe(SPAWN_COUNT)
    }
  )
})
