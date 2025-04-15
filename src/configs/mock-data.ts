import { subDays, format } from 'date-fns'
import { nanoid } from 'nanoid'
import { DefaultTemplate, Sandbox, SandboxMetrics, Template } from '@/types/api'
import { addHours, subHours } from 'date-fns'

const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    aliases: ['code-interpreter'],
    buildID: 'build_000',
    cpuCount: 1,
    memoryMB: 1024,
    public: true,
    templateID: 'code-interpreter-v1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: {
      email: 'admin@example.com',
      id: 'user_001',
    },
    isDefault: true,
    defaultDescription: 'Code Interpreter',
  },
  {
    aliases: ['web-starter'],
    buildID: 'build_005',
    cpuCount: 2,
    memoryMB: 2048,
    public: true,
    templateID: 'web-starter-v1',
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z',
    createdBy: null,
    isDefault: true,
    defaultDescription: 'Web Development Environment',
  },
  {
    aliases: ['data-science'],
    buildID: 'build_006',
    cpuCount: 4,
    memoryMB: 8192,
    public: true,
    templateID: 'data-science-v1',
    createdAt: '2024-01-06T00:00:00Z',
    updatedAt: '2024-01-06T00:00:00Z',
    createdBy: {
      email: 'datascience@example.com',
      id: 'user_002',
    },
    isDefault: true,
    defaultDescription: 'Data Science Environment with ML Libraries',
  },
]

const TEMPLATES: Template[] = [
  {
    aliases: ['node-typescript', 'node-ts'],
    buildID: 'build_001',
    cpuCount: 2,
    memoryMB: 2048,
    public: true,
    templateID: 'node-typescript-v1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: {
      email: 'admin@example.com',
      id: 'user_001',
    },
  },
  {
    aliases: ['react-vite'],
    buildID: 'build_002',
    cpuCount: 1,
    memoryMB: 1024,
    public: true,
    templateID: 'react-vite-v2',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    createdBy: null,
  },
  {
    aliases: ['postgres', 'pg'],
    buildID: 'build_003',
    cpuCount: 2,
    memoryMB: 4096,
    public: false,
    templateID: 'postgres-v15',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
    createdBy: null,
  },
  {
    aliases: ['redis'],
    buildID: 'build_004',
    cpuCount: 1,
    memoryMB: 2048,
    public: true,
    templateID: 'redis-v7',
    createdAt: '2024-01-04T00:00:00Z',
    updatedAt: '2024-01-04T00:00:00Z',
    createdBy: null,
  },
  {
    aliases: ['python-ml', 'ml'],
    buildID: 'build_005',
    cpuCount: 4,
    memoryMB: 8192,
    public: false,
    templateID: 'python-ml-v1',
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z',
    createdBy: null,
  },
  {
    aliases: ['elastic', 'es'],
    buildID: 'build_006',
    cpuCount: 2,
    memoryMB: 4096,
    public: true,
    templateID: 'elastic-v8',
    createdAt: '2024-01-06T00:00:00Z',
    updatedAt: '2024-01-06T00:00:00Z',
    createdBy: null,
  },
  {
    aliases: ['grafana'],
    buildID: 'build_007',
    cpuCount: 1,
    memoryMB: 2048,
    public: true,
    templateID: 'grafana-v9',
    createdAt: '2024-01-07T00:00:00Z',
    updatedAt: '2024-01-07T00:00:00Z',
    createdBy: null,
  },
  {
    aliases: ['nginx'],
    buildID: 'build_008',
    cpuCount: 1,
    memoryMB: 1024,
    public: true,
    templateID: 'nginx-v1',
    createdAt: '2024-01-08T00:00:00Z',
    updatedAt: '2024-01-08T00:00:00Z',
    createdBy: null,
  },
  {
    aliases: ['mongodb', 'mongo'],
    buildID: 'build_009',
    cpuCount: 2,
    memoryMB: 4096,
    public: true,
    templateID: 'mongodb-v6',
    createdAt: '2024-01-09T00:00:00Z',
    updatedAt: '2024-01-09T00:00:00Z',
    createdBy: null,
  },
  {
    aliases: ['mysql'],
    buildID: 'build_010',
    cpuCount: 2,
    memoryMB: 4096,
    public: true,
    templateID: 'mysql-v8',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
    createdBy: null,
  },
] as const

const ENVIRONMENTS = ['prod', 'staging', 'dev', 'test'] as const
const COMPONENTS = [
  'backend',
  'frontend',
  'api',
  'auth',
  'cache',
  'database',
  'queue',
  'search',
  'monitoring',
] as const

function generateMockSandboxes(count: number): Sandbox[] {
  const sandboxes: Sandbox[] = []
  const baseDate = new Date()

  for (let i = 0; i < count; i++) {
    const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)]
    const env = ENVIRONMENTS[Math.floor(Math.random() * ENVIRONMENTS.length)]
    const component = COMPONENTS[Math.floor(Math.random() * COMPONENTS.length)]

    // Distribute sandboxes randomly within 24 hours from the base date
    const startDate = subHours(baseDate, Math.floor(Math.random() * 30))
    const endDate = addHours(startDate, 24)

    // Random memory and CPU from template's allowed values
    const memory = template.memoryMB
    const cpu = template.cpuCount

    sandboxes.push({
      alias: `${env}-${component}-${nanoid(4)}`,
      clientID: nanoid(8),
      cpuCount: cpu,
      endAt: endDate.toISOString(),
      memoryMB: memory,
      metadata: {
        lastUpdate: new Date(
          startDate.getTime() + 2 * 60 * 60 * 1000
        ).toISOString(),
        status: {
          health: ['healthy', 'degraded', 'warning', 'error'][
            Math.floor(Math.random() * 4)
          ],
          uptime: Math.floor(Math.random() * 1000000), // seconds
          restarts: Math.floor(Math.random() * 5),
        },
        network: {
          ingressBytes: Math.floor(Math.random() * 1024 * 1024 * 1024),
          egressBytes: Math.floor(Math.random() * 1024 * 1024 * 1024),
          connections: Math.floor(Math.random() * 1000),
          ports: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () =>
            Math.floor(Math.random() * 65535)
          ),
        },
        config: {
          env: {
            NODE_ENV: env,
            LOG_LEVEL: ['debug', 'info', 'warn', 'error'][
              Math.floor(Math.random() * 4)
            ],
            REGION: ['us-east-1', 'eu-west-1', 'ap-south-1'][
              Math.floor(Math.random() * 3)
            ],
          },
          features: Array.from(
            { length: Math.floor(Math.random() * 4) },
            () =>
              ['metrics', 'tracing', 'debugging', 'profiling', 'logging'][
                Math.floor(Math.random() * 5)
              ]
          ),
        },
        deployment: {
          version: `v${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
          commitHash: nanoid(7),
          deployedBy: `user_${nanoid(4)}`,
          deployedAt: new Date(
            startDate.getTime() + Math.floor(Math.random() * 60 * 60 * 1000)
          ).toISOString(),
        },
        resources: {
          volumes: Array.from(
            { length: Math.floor(Math.random() * 3) },
            () => ({
              name: ['data', 'config', 'cache', 'logs'][
                Math.floor(Math.random() * 4)
              ],
              size: `${Math.floor(Math.random() * 100)}Gi`,
              used: `${Math.floor(Math.random() * 100)}%`,
            })
          ),
          endpoints: Array.from(
            { length: Math.floor(Math.random() * 2) + 1 },
            () => ({
              type: ['http', 'grpc', 'websocket'][
                Math.floor(Math.random() * 3)
              ],
              url: `https://${nanoid(8)}.sandbox.example.com`,
            })
          ),
        },
      },
      sandboxID: nanoid(8),
      startedAt: startDate.toISOString(),
      templateID: template.templateID,
    })
  }

  return sandboxes
}

function generateMockMetrics(
  sandboxes: Sandbox[]
): Map<string, SandboxMetrics> {
  const metrics = new Map<string, SandboxMetrics>()

  // Define characteristics by template type
  const templatePatterns: Record<
    string,
    { memoryProfile: string; cpuIntensity: number }
  > = {
    'node-typescript-v1': { memoryProfile: 'web', cpuIntensity: 0.4 },
    'react-vite-v2': { memoryProfile: 'web', cpuIntensity: 0.5 },
    'postgres-v15': { memoryProfile: 'database', cpuIntensity: 0.6 },
    'redis-v7': { memoryProfile: 'cache', cpuIntensity: 0.2 },
    'python-ml-v1': { memoryProfile: 'ml', cpuIntensity: 0.9 },
    'elastic-v8': { memoryProfile: 'search', cpuIntensity: 0.7 },
    'grafana-v9': { memoryProfile: 'visualization', cpuIntensity: 0.3 },
    'nginx-v1': { memoryProfile: 'web', cpuIntensity: 0.2 },
    'mongodb-v6': { memoryProfile: 'database', cpuIntensity: 0.5 },
    'mysql-v8': { memoryProfile: 'database', cpuIntensity: 0.6 },
  }

  const memoryBaselines: Record<string, number> = {
    web: 0.15,
    database: 0.4,
    cache: 0.2,
    ml: 0.6,
    search: 0.45,
    visualization: 0.25,
  }

  const memoryVolatility: Record<string, number> = {
    web: 0.15,
    database: 0.1,
    cache: 0.3,
    ml: 0.35,
    search: 0.2,
    visualization: 0.15,
  }

  for (const sandbox of sandboxes) {
    const pattern = templatePatterns[sandbox.templateID] || {
      memoryProfile: 'web',
      cpuIntensity: 0.5,
    }

    const memBaseline = memoryBaselines[pattern.memoryProfile]
    const memVolatility = memoryVolatility[pattern.memoryProfile]

    // Generate current load based on time of day
    const hourOfDay = new Date().getHours()
    const isBusinessHours = hourOfDay >= 8 && hourOfDay <= 18
    const baseLoad = isBusinessHours
      ? 0.5 + Math.random() * 0.3
      : 0.2 + Math.random() * 0.2

    // CPU calculation
    const cpuSpike = Math.random() < 0.1 ? Math.random() * 0.5 : 0
    const cpuLoad = Math.max(
      0,
      Math.min(1, (baseLoad + cpuSpike) * pattern.cpuIntensity)
    )
    const cpuUsedPct = Math.min(100, Math.max(0, cpuLoad * 100))

    // Memory calculation
    const memoryNoise = (Math.random() - 0.5) * memVolatility
    const memPct = memBaseline + baseLoad * memVolatility + memoryNoise
    const memMiBUsed = Math.floor(sandbox.memoryMB * Math.min(0.945, memPct))

    metrics.set(sandbox.sandboxID, {
      cpuCount: sandbox.cpuCount,
      cpuUsedPct,
      memTotalMiB: Math.round(sandbox.memoryMB * 0.945),
      memUsedMiB: memMiBUsed,
      timestamp: new Date().toISOString(),
    })
  }

  return metrics
}

type ChartData = {
  x: string
  y: number
}[]

// Helper function to generate random values with a base and variation
const generateRandomValue = (base: number, variation: number) => {
  return base + (Math.random() * variation * 2 - variation)
}

// Helper function to generate time series data with monthly intervals
const generateMonthlyTimeSeries = (
  months: number,
  valueGenerator: () => number
): ChartData => {
  const data: ChartData = []
  const today = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
    data.push({
      x: format(date, 'MMM yyyy'),
      y: valueGenerator(),
    })
  }

  return data
}

// Cost data: Simulates monthly costs with business-like variations
export const generateCostData = (months = 12): ChartData => {
  let lastValue = 50 // Start with base cost
  return generateMonthlyTimeSeries(months, () => {
    // Simulate gradual cost changes with occasional spikes
    const trend = Math.random() > 0.7 ? 15 : 5 // Occasional larger changes
    const change = generateRandomValue(0, trend)
    lastValue = Math.max(20, Math.min(100, lastValue + change))
    return Number(lastValue.toFixed(2))
  })
}

// VCPU data: Simulates monthly CPU usage with business patterns
export const generateVCPUData = (months = 12): ChartData => {
  let baseUsage = 40
  return generateMonthlyTimeSeries(months, () => {
    // Simulate seasonal/quarterly patterns
    const quarterEffect = Math.sin((new Date().getMonth() / 12) * Math.PI * 2) * 10
    const randomVariation = generateRandomValue(0, 15)
    baseUsage = Math.max(20, Math.min(80, baseUsage + quarterEffect + randomVariation))
    return Number(baseUsage.toFixed(2))
  })
}

// RAM data: Simulates monthly memory usage with gradual scaling
export const generateRAMData = (months = 12): ChartData => {
  let currentValue = 60
  return generateMonthlyTimeSeries(months, () => {
    // Simulate gradual scaling with memory optimization periods
    const optimization = Math.random() > 0.8 ? -10 : 0 // Occasional optimization
    const change = generateRandomValue(0, 8) + optimization
    currentValue = Math.max(30, Math.min(90, currentValue + change))
    return Number(currentValue.toFixed(2))
  })
}

export const MOCK_METRICS_DATA = (sandboxes: Sandbox[]) =>
  generateMockMetrics(sandboxes)
export const MOCK_SANDBOXES_DATA = () => generateMockSandboxes(300)
export const MOCK_TEMPLATES_DATA = TEMPLATES
export const MOCK_DEFAULT_TEMPLATES_DATA = DEFAULT_TEMPLATES
export const MOCK_COST_DATA = generateCostData()
export const MOCK_VCPU_DATA = generateVCPUData()
export const MOCK_RAM_DATA = generateRAMData()
