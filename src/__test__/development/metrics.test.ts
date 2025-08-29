import { l } from '@/lib/clients/logger/logger'
import { Sandbox } from 'e2b'
import { describe, expect, it } from 'vitest'

// Ensure required environment variables exist
const { TEST_E2B_DOMAIN, TEST_E2B_API_KEY } = import.meta.env

if (!TEST_E2B_DOMAIN || !TEST_E2B_API_KEY) {
  throw new Error(
    'Missing environment variables: TEST_E2B_DOMAIN and/or TEST_E2B_API_KEY'
  )
}

const SPAWN_COUNT = 10 // total sandboxes to spawn
const BATCH_SIZE = 2 // how many sandboxes to spawn concurrently

const SBX_TIMEOUT_MS = 40_000
const STRESS_TIMEOUT_MS = 40_000
const TEMPLATE = process.env.TEST_E2B_TEMPLATE ?? 'base'

const MEMORY_MB = 1024 // allocate this much memory inside sandbox in MB
const CPU_OPS = 100_000_000 // iterations of CPU intensive math
const CHUNK_SIZE_MB = 64 // memory allocation chunk size in MB
const PROGRESS_INTERVAL = 10_000_000 // report progress every N operations

interface StressTestConfig {
  memoryMb: number
  cpuOps: number
  ioOps: number
  chunkSizeMb: number
  progressInterval: number
  enableMemoryTest: boolean
  enableCpuTest: boolean
  enableIoTest: boolean
}

function buildOptimizedStressCode(config: StressTestConfig): string {
  const {
    memoryMb,
    cpuOps,
    chunkSizeMb,
    progressInterval,
    enableMemoryTest,
    enableCpuTest,
    enableIoTest,
  } = config

  return `
#!/bin/bash
set -e

# Create test directory structure
mkdir -p /home/user/test/{data,logs,temp}
cd /home/user/test

echo "STRESS_START $(date -Iseconds)"

# Create test files for I/O operations
cat > test1.txt << 'EOL'
This is a test file 1 for I/O stress testing
Contains multiple lines of text data
Used for sequential and random access patterns
EOL

cat > test2.json << 'EOL'
{
  "name": "Test file 2",
  "type": "json",
  "data": {
    "array": [1, 2, 3, 4, 5],
    "nested": {"key": "value", "number": 42}
  }
}
EOL

cat > test3.md << 'EOL'
# Test file 3
This is a markdown file for stress testing
## Features
- Multi-line content
- Various formatting
- Used for file I/O benchmarks
EOL

# Generate comprehensive stress test script
cat > stress.py << 'EOL'
import time, math, random, os, sys, threading, json
from concurrent.futures import ThreadPoolExecutor, as_completed

class StressTestRunner:
    def __init__(self, mem_mb, cpu_ops, chunk_mb, progress_interval):
        self.mem_mb = mem_mb
        self.cpu_ops = cpu_ops
        self.chunk_mb = chunk_mb
        self.progress_interval = progress_interval
        self.start_time = time.time()

    def log_progress(self, phase, progress, total, extra_info=""):
        elapsed = time.time() - self.start_time
        percent = (progress / total * 100) if total > 0 else 0
        print(f"STRESS_PROGRESS phase={phase} progress={progress}/{total} percent={percent:.1f} elapsed={elapsed:.2f}s {extra_info}")

    def memory_stress_test(self):
        """Chunked memory allocation with pattern testing"""
        if not ${enableMemoryTest}:
            print("STRESS_SKIP phase=memory reason=disabled")
            return

        print("STRESS_PHASE_START phase=memory target_mb=${memoryMb}")
        chunks = []
        chunk_size = self.chunk_mb * 1024 * 1024
        total_chunks = self.mem_mb // self.chunk_mb

        try:
            # Phase 1: Chunked allocation
            for i in range(total_chunks):
                chunk = bytearray(chunk_size)
                chunks.append(chunk)
                self.log_progress("memory_alloc", i + 1, total_chunks, f"allocated_mb={(i+1)*self.chunk_mb}")

            # Phase 2: Memory pattern testing
            print("STRESS_PHASE_START phase=memory_patterns")
            for i, chunk in enumerate(chunks):
                # Sequential write pattern
                for j in range(0, len(chunk), 4096):
                    chunk[j] = (i + j) % 256

                # Random access pattern
                for _ in range(1000):
                    idx = random.randint(0, len(chunk) - 1)
                    chunk[idx] = random.randint(0, 255)

                if (i + 1) % 10 == 0:
                    self.log_progress("memory_patterns", i + 1, len(chunks))

            print(f"STRESS_PHASE_COMPLETE phase=memory allocated_chunks={len(chunks)} total_mb={len(chunks) * self.chunk_mb}")

        except MemoryError as e:
            print(f"STRESS_ERROR phase=memory error=MemoryError chunks_allocated={len(chunks)} details={str(e)}")

        return chunks

    def cpu_stress_test(self):
        """Multi-threaded CPU stress with various operation types"""
        if not ${enableCpuTest}:
            print("STRESS_SKIP phase=cpu reason=disabled")
            return 0.0

        print("STRESS_PHASE_START phase=cpu target_ops=${cpuOps}")

        def worker_thread(thread_id, ops_per_thread):
            """Worker function for CPU stress testing"""
            local_total = 0.0
            ops_completed = 0

            for i in range(ops_per_thread):
                # Mix of different CPU operations
                if i % 4 == 0:
                    # Floating point operations
                    local_total += math.sin(random.random()) * math.cos(random.random())
                elif i % 4 == 1:
                    # Integer operations
                    local_total += (i * 17 + 23) % 1000
                elif i % 4 == 2:
                    # String operations
                    temp_str = f"stress_test_{i}_{random.randint(1000, 9999)}"
                    local_total += len(temp_str) * hash(temp_str) % 1000
                else:
                    # List operations
                    temp_list = [random.randint(1, 100) for _ in range(10)]
                    local_total += sum(temp_list) % 1000

                ops_completed += 1
                if ops_completed % self.progress_interval == 0:
                    self.log_progress(f"cpu_thread_{thread_id}", ops_completed, ops_per_thread)

            return local_total

        # Use multiple threads for CPU stress
        num_threads = min(4, os.cpu_count() or 1)
        ops_per_thread = self.cpu_ops // num_threads
        total_result = 0.0

        print(f"STRESS_INFO phase=cpu threads={num_threads} ops_per_thread={ops_per_thread}")

        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [executor.submit(worker_thread, i, ops_per_thread) for i in range(num_threads)]

            for future in as_completed(futures):
                try:
                    result = future.result()
                    total_result += result
                except Exception as e:
                    print(f"STRESS_ERROR phase=cpu_thread error={str(e)}")

        print(f"STRESS_PHASE_COMPLETE phase=cpu threads={num_threads} total_result={total_result}")
        return total_result

    def io_stress_test(self):
        """File I/O stress testing"""
        if not ${enableIoTest}:
            print("STRESS_SKIP phase=io reason=disabled")
            return

        print("STRESS_PHASE_START phase=io")

        try:
            # Create multiple test files
            for i in range(10):
                filename = f"temp/stress_file_{i}.dat"
                with open(filename, 'w') as f:
                    # Write substantial data
                    for j in range(1000):
                        f.write(f"Line {j} in file {i} with timestamp {time.time()}\\n")

                self.log_progress("io_write", i + 1, 10)

            # Read files back
            total_bytes = 0
            for i in range(10):
                filename = f"temp/stress_file_{i}.dat"
                with open(filename, 'r') as f:
                    content = f.read()
                    total_bytes += len(content)

                self.log_progress("io_read", i + 1, 10)

            # JSON operations
            test_data = {"iteration": i, "data": list(range(100)), "timestamp": time.time()}
            for i in range(100):
                with open(f"temp/json_test_{i}.json", 'w') as f:
                    json.dump(test_data, f)

                if (i + 1) % 20 == 0:
                    self.log_progress("io_json", i + 1, 100)

            print(f"STRESS_PHASE_COMPLETE phase=io total_bytes={total_bytes}")

        except Exception as e:
            print(f"STRESS_ERROR phase=io error={str(e)}")

    def run_all_tests(self):
        """Run all stress tests in sequence"""
        print(f"STRESS_CONFIG mem_mb={self.mem_mb} cpu_ops={self.cpu_ops} chunk_mb={self.chunk_mb}")

        # Run tests
        chunks = self.memory_stress_test()
        cpu_result = self.cpu_stress_test()
        self.io_stress_test()

        # Cleanup
        if chunks:
            del chunks

        total_duration = time.time() - self.start_time
        print(f"STRESS_COMPLETE duration={total_duration:.2f}s cpu_result={cpu_result}")

# Initialize and run stress test
runner = StressTestRunner(${memoryMb}, ${cpuOps}, ${chunkSizeMb}, ${progressInterval})
runner.run_all_tests()
EOL

echo "STRESS_EXECUTING $(date -Iseconds)"
python3 stress.py
echo "STRESS_FINISHED $(date -Iseconds)"

# Cleanup
rm -rf temp/
ls -la
`
}

describe('E2B Sandbox metrics', () => {
  it(
    `spawns ${SPAWN_COUNT} sandbox(es) using template "${TEMPLATE}"`,
    { timeout: 60_000 },
    async () => {
      const sandboxes: Sandbox[] = []
      const testId = `metrics-test-${Date.now()}`

      l.info(
        {
          key: 'test:starting_sandboxes',
          testId,
          spawnCount: SPAWN_COUNT,
          batchSize: BATCH_SIZE,
          template: TEMPLATE,
          memoryMb: MEMORY_MB,
          cpuOps: CPU_OPS,
        },
        `Starting ${SPAWN_COUNT} sandboxes with batch size ${BATCH_SIZE}`
      )

      const start = Date.now()

      const spawnBatch = async (batchNumber: number, count: number) => {
        const batchStart = Date.now()

        l.info(
          {
            key: 'test:starting_sandbox_batch',
            testId,
            batchNumber,
            batchSize: count,
            totalSpawned: sandboxes.length,
            remaining: SPAWN_COUNT - sandboxes.length,
          },
          `Starting sandbox batch ${batchNumber} with size ${count}, ${SPAWN_COUNT - sandboxes.length} remaining`
        )

        try {
          const batch = await Promise.all(
            Array.from({ length: count }).map(async (_, index) => {
              const sandboxStart = Date.now()

              try {
                const sandbox = await Sandbox.create(TEMPLATE, {
                  domain: TEST_E2B_DOMAIN as string,
                  apiKey: TEST_E2B_API_KEY as string,
                  timeoutMs: SBX_TIMEOUT_MS,
                  secure: true,
                })

                const sandboxDuration = Date.now() - sandboxStart
                l.debug(
                  {
                    key: 'test:sandbox_created',
                    testId,
                    batchNumber,
                    sandboxIndex: index,
                    duration: sandboxDuration,
                  },
                  `Sandbox created in batch ${batchNumber} at index ${index} in ${sandboxDuration}ms`
                )

                return sandbox
              } catch (error) {
                const sandboxDuration = Date.now() - sandboxStart
                l.error(
                  {
                    key: 'test:sandbox_creation_failed',
                    error,
                    testId,
                    batchNumber,
                    sandboxIndex: index,
                    duration: sandboxDuration,
                  },
                  `Sandbox creation failed in batch ${batchNumber} at index ${index} after ${sandboxDuration}ms`
                )
                throw error
              }
            })
          )

          sandboxes.push(...batch)
          const batchDuration = Date.now() - batchStart

          l.info('test:batch_completed', {
            testId,
            batchNumber,
            batchSize: count,
            successCount: batch.length,
            batchDuration,
            totalSpawned: sandboxes.length,
            averageSpawnTime: batchDuration / count,
          })

          // Brief pause between batches to prevent overwhelming the system
          await new Promise((resolve) => setTimeout(resolve, 1_000))
        } catch (error) {
          const batchDuration = Date.now() - batchStart
          l.error(
            {
              key: 'test:batch_creation_failed',
              error,
              testId,
              batchNumber,
              batchDuration,
            },
            `Batch ${batchNumber} creation failed after ${batchDuration}ms`
          )
          throw error
        }
      }

      // Spawn sandboxes in batches
      let batchNumber = 0
      for (let spawned = 0; spawned < SPAWN_COUNT; spawned += BATCH_SIZE) {
        const remaining = SPAWN_COUNT - spawned
        const currentBatchSize = Math.min(remaining, BATCH_SIZE)
        await spawnBatch(++batchNumber, currentBatchSize)
      }

      const spawnDurationMs = Date.now() - start
      l.info(
        {
          key: 'test:all_sandboxes_spawned',
          testId,
          totalSandboxes: sandboxes.length,
          spawnDurationMs,
          averageSpawnMs: spawnDurationMs / sandboxes.length,
        },
        `All ${sandboxes.length} sandboxes spawned in ${spawnDurationMs}ms, average ${(spawnDurationMs / sandboxes.length).toFixed(2)}ms per sandbox`
      )

      const stressConfig: StressTestConfig = {
        memoryMb: MEMORY_MB,
        cpuOps: CPU_OPS,
        ioOps: 1000,
        chunkSizeMb: CHUNK_SIZE_MB,
        progressInterval: PROGRESS_INTERVAL,
        enableMemoryTest: true,
        enableCpuTest: true,
        enableIoTest: true,
      }

      const stressCode = buildOptimizedStressCode(stressConfig)

      l.debug(
        {
          key: 'test:stress_code_generated',
          testId,
          stressConfig,
          codeLength: stressCode.length,
        },
        `Stress code generated with length ${stressCode.length} bytes`
      )

      const runStressCode = async () => {
        const stressStart = Date.now()
        const results: Array<{
          sandboxId: string
          success: boolean
          duration?: number
          error?: string
          output?: string
          exitCode?: number
        }> = []

        l.info(
          {
            key: 'test:starting_stress_test',
            testId,
            sandboxCount: sandboxes.length,
            stressTestConfig: stressConfig,
          },
          `Starting stress test on ${sandboxes.length} sandboxes`
        )

        try {
          // Execute stress code inside each sandbox with detailed logging
          const stressPromises = sandboxes.map(async (sbx, index) => {
            const sandboxStressStart = Date.now()

            l.debug(
              {
                key: 'test:starting_stress_test_for_sandbox',
                testId,
                sandboxId: sbx.sandboxId,
                sandboxIndex: index,
                totalSandboxes: sandboxes.length,
              },
              `Starting stress test for sandbox ${sbx.sandboxId} (${index + 1}/${sandboxes.length})`
            )

            try {
              // Write stress test script to sandbox with proper path
              const scriptPath = '/home/user/stress_test.sh'

              l.debug(
                {
                  key: 'test:writing_stress_script',
                  testId,
                  sandboxId: sbx.sandboxId,
                  sandboxIndex: index,
                  scriptPath,
                  codeLength: stressCode.length,
                },
                `Writing stress script to sandbox ${sbx.sandboxId} at path ${scriptPath}`
              )

              await sbx.files.write(scriptPath, stressCode)

              // Verify file was written successfully
              const fileCheck = await sbx.commands.run(`ls -la ${scriptPath}`, {
                user: 'root',
              })
              if (fileCheck.exitCode !== 0) {
                l.warn(
                  {
                    key: 'test:file_write_verification_failed',
                    testId,
                    sandboxId: sbx.sandboxId,
                    error: fileCheck.stderr,
                    stdout: fileCheck.stdout,
                  },
                  `File write verification failed for sandbox ${sbx.sandboxId}: ${fileCheck.stderr}`
                )

                results.push({
                  sandboxId: sbx.sandboxId,
                  success: false,
                  error: fileCheck.stderr,
                })
                return
              }

              l.debug(
                {
                  key: 'test:file_written_successfully',
                  testId,
                  sandboxId: sbx.sandboxId,
                  sandboxIndex: index,
                },
                `Stress script file written successfully to sandbox ${sbx.sandboxId}`
              )

              // Make script executable
              const chmodResult = await sbx.commands.run(
                `chmod +x ${scriptPath}`,
                { user: 'root' }
              )
              if (chmodResult.exitCode !== 0) {
                l.warn(
                  {
                    key: 'test:chmod_failed',
                    testId,
                    sandboxId: sbx.sandboxId,
                    error: chmodResult.stderr,
                    stdout: chmodResult.stdout,
                  },
                  `Failed to set executable permissions on stress script for sandbox ${sbx.sandboxId}: ${chmodResult.stderr}`
                )

                results.push({
                  sandboxId: sbx.sandboxId,
                  success: false,
                  error: chmodResult.stderr,
                })
                return
              }

              l.debug(
                {
                  key: 'test:stress_script_ready',
                  testId,
                  sandboxId: sbx.sandboxId,
                  sandboxIndex: index,
                },
                `Stress script ready for execution in sandbox ${sbx.sandboxId}`
              )

              // Execute stress test with output capture - handle non-zero exit codes gracefully
              let result
              try {
                result = await sbx.commands.run(scriptPath, {
                  timeoutMs: STRESS_TIMEOUT_MS,
                  requestTimeoutMs: STRESS_TIMEOUT_MS,
                  user: 'root',
                })
              } catch (commandError) {
                // Handle command execution errors gracefully
                const sandboxStressDuration = Date.now() - sandboxStressStart
                const errorMessage =
                  commandError instanceof Error
                    ? commandError.message
                    : String(commandError)

                l.warn(
                  {
                    key: 'test:stress_command_execution_failed',
                    testId,
                    sandboxId: sbx.sandboxId,
                    sandboxIndex: index,
                    duration: sandboxStressDuration,
                    error: errorMessage,
                  },
                  `Stress command execution failed for sandbox ${sbx.sandboxId} after ${sandboxStressDuration}ms: ${errorMessage}`
                )

                results.push({
                  sandboxId: sbx.sandboxId,
                  success: false,
                  error: errorMessage,
                })

                return
              }

              const sandboxStressDuration = Date.now() - sandboxStressStart

              // Log completion regardless of exit code
              l.info('test:stress_test_completed', {
                testId,
                sandboxId: sbx.sandboxId,
                sandboxIndex: index,
                duration: sandboxStressDuration,
                exitCode: result.exitCode,
                outputLength: result.stdout?.length || 0,
                errorLength: result.stderr?.length || 0,
                success: result.exitCode === 0,
              })

              // Parse stress test output for metrics
              const output = (result.stdout || '') + (result.stderr || '')
              const progressLines = output
                .split('\n')
                .filter(
                  (line) =>
                    line.includes('STRESS_PROGRESS') ||
                    line.includes('STRESS_DONE') ||
                    line.includes('STRESS_ERROR') ||
                    line.includes('STRESS_COMPLETE')
                )

              if (progressLines.length > 0) {
                l.debug(
                  {
                    key: 'test:stress_progress_captured',
                    testId,
                    sandboxId: sbx.sandboxId,
                    progressLines: progressLines.slice(-5), // Last 5 progress lines
                  },
                  `Captured ${progressLines.length} progress lines from sandbox ${sbx.sandboxId}`
                )
              }

              // Log stderr if present but don't fail the test
              if (result.stderr && result.stderr.trim()) {
                l.warn(
                  {
                    key: 'test:stress_stderr_output',
                    testId,
                    sandboxId: sbx.sandboxId,
                    stderr: result.stderr.slice(0, 500), // First 500 chars
                  },
                  `Stress test produced stderr output for sandbox ${sbx.sandboxId}`
                )
              }

              results.push({
                sandboxId: sbx.sandboxId,
                success: result.exitCode === 0,
                duration: sandboxStressDuration,
                output: output.slice(-500), // Last 500 chars of output
                exitCode: result.exitCode,
              })

              return result
            } catch (error) {
              const sandboxStressDuration = Date.now() - sandboxStressStart
              const errorMessage =
                error instanceof Error ? error.message : String(error)

              l.warn(
                {
                  key: 'test:stress_test_unexpected_error',
                  testId,
                  sandboxId: sbx.sandboxId,
                  sandboxIndex: index,
                  duration: sandboxStressDuration,
                  error: errorMessage,
                  errorStack: error instanceof Error ? error.stack : undefined,
                },
                `Unexpected error during stress test for sandbox ${sbx.sandboxId} after ${sandboxStressDuration}ms: ${errorMessage}`
              )

              results.push({
                sandboxId: sbx.sandboxId,
                success: false,
                duration: sandboxStressDuration,
                error: `Unexpected error: ${errorMessage}`,
              })

              return null // Continue with other sandboxes - don't throw
            }
          })

          // Wait for all stress tests to complete - use allSettled to handle rejections gracefully
          const stressResults = await Promise.allSettled(stressPromises)

          // Log any rejected promises
          stressResults.forEach((result, index) => {
            if (result.status === 'rejected') {
              l.warn(
                {
                  key: 'test:stress_promise_rejected',
                  testId,
                  sandboxIndex: index,
                  error:
                    result.reason instanceof Error
                      ? result.reason.message
                      : String(result.reason),
                },
                `Stress test promise rejected for sandbox at index ${index}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`
              )
            }
          })

          const totalStressDuration = Date.now() - stressStart
          const successCount = results.filter((r) => r.success).length
          const failureCount = results.filter((r) => !r.success).length
          const averageDuration =
            results.reduce((sum, r) => sum + (r.duration || 0), 0) /
            results.length

          l.info(
            {
              key: 'test:stress_execution_completed',
              testId,
              totalStressDuration,
              successCount,
              failureCount,
              totalSandboxes: sandboxes.length,
              successRate: (successCount / sandboxes.length) * 100,
              averageSandboxDuration: averageDuration,
            },
            `Stress execution completed in ${totalStressDuration}ms with ${successCount} successes and ${failureCount} failures (${((successCount / sandboxes.length) * 100).toFixed(1)}% success rate)`
          )

          // Log detailed results summary
          const errorSummary = results
            .filter((r) => !r.success)
            .map((r) => ({ sandboxId: r.sandboxId, error: r.error }))

          if (errorSummary.length > 0) {
            l.warn(
              {
                key: 'test:stress_failures_detected',
                testId,
                errorSummary: errorSummary.slice(0, 10), // First 10 errors
              },
              `Detected ${errorSummary.length} stress test failures`
            )
          }
        } catch (error) {
          const totalStressDuration = Date.now() - stressStart
          l.error(
            {
              key: 'test:stress_execution_failed',
              error,
              testId,
              totalStressDuration,
              resultsCount: results.length,
            },
            `Stress execution failed after ${totalStressDuration}ms: ${error instanceof Error ? error.message : String(error)}`
          )
          throw error
        }

        return results
      }

      // Execute stress tests and capture results
      const stressResults = await runStressCode()

      // Final test summary
      const totalTestDuration = Date.now() - start
      l.info(
        {
          key: 'test:metrics_test_completed',
          testId,
          totalTestDuration,
          spawnDurationMs,
          stressDurationMs: totalTestDuration - spawnDurationMs,
          totalSandboxes: sandboxes.length,
          stressResults: {
            total: stressResults.length,
            successful: stressResults.filter((r) => r.success).length,
            failed: stressResults.filter((r) => !r.success).length,
          },
        },
        `Metrics test completed in ${totalTestDuration}ms (spawn: ${spawnDurationMs}ms, stress: ${totalTestDuration - spawnDurationMs}ms) with ${stressResults.filter((r) => r.success).length}/${stressResults.length} successful stress tests`
      )

      expect(sandboxes.length).toBe(SPAWN_COUNT)
    }
  )
})
