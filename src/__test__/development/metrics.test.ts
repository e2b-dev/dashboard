import { describe, it, expect } from 'vitest'
import { Sandbox } from 'e2b'

// Ensure required environment variables exist
const { TEST_E2B_DOMAIN, TEST_E2B_API_KEY } = import.meta.env

if (!TEST_E2B_DOMAIN || !TEST_E2B_API_KEY) {
  throw new Error(
    'Missing environment variables: TEST_E2B_DOMAIN and/or TEST_E2B_API_KEY'
  )
}

// Configurable parameters
const SPAWN_COUNT = 30 // total sandboxes to spawn
const BATCH_SIZE = 5 // how many sandboxes to spawn concurrently

// Timeout for sandbox operations (ms)
const SBX_TIMEOUT_MS = 60_000
const STRESS_TIMEOUT_MS = 60_000
const TEMPLATE = process.env.TEST_METRICS_TEMPLATE ?? 'base'

// Load generation parameters
const MEMORY_MB = 800 // allocate this much memory inside sandbox in MB
const CPU_OPS = 5_000_000 // iterations of CPU intensive math

// Python snippet that stresses memory & CPU
function buildStressCode(memoryMb: number, cpuOps: number): string {
  return `
cat > stress.py << 'EOL'
import time, math, random, os, sys

mem_mb = ${memoryMb}
cpu_ops = ${cpuOps}

start = time.time()

# Allocate memory (bytearray)
chunk = bytearray(mem_mb * 1024 * 1024)

# Touch memory to ensure allocation
for i in range(0, len(chunk), 4096):
    chunk[i] = 1

# CPU intensive loop
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
    async () => {
      const sandboxes: Sandbox[] = []

      const start = Date.now()

      // Helper to spawn a batch of sandboxes concurrently
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
      }

      // Spawn sandboxes respecting the batch size
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
        // ignore errors
      }

      expect(sandboxes.length).toBe(SPAWN_COUNT)
    },
    { timeout: 90_000 }
  )
})
