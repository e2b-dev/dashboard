import { addHours, subHours } from 'date-fns'
import { nanoid } from 'nanoid'
import type { Sandbox, Sandboxes } from '@/core/modules/sandboxes/models'
import type { ClientSandboxesMetrics } from '@/core/modules/sandboxes/models.client'
import type { DefaultTemplate, Template } from '@/core/modules/templates/models'

const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    aliases: ['code-interpreter'],
    names: ['code-interpreter'],
    buildID: 'build_000',
    cpuCount: 1,
    memoryMB: 1024,
    diskSizeMB: 1024,
    envdVersion: '0.1.0',
    public: true,
    templateID: 'code-interpreter-v1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    isDefault: true,
    defaultDescription: 'Code Interpreter',
    lastSpawnedAt: '2024-01-01T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
  {
    aliases: ['web-starter'],
    names: ['web-starter'],
    buildID: 'build_005',
    cpuCount: 2,
    memoryMB: 2048,
    diskSizeMB: 1024,
    envdVersion: '0.1.0',
    public: true,
    templateID: 'web-starter-v1',
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z',
    isDefault: true,
    defaultDescription: 'Web Development Environment',
    lastSpawnedAt: '2024-01-05T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
  {
    aliases: ['data-science'],
    names: ['data-science'],
    buildID: 'build_006',
    cpuCount: 4,
    memoryMB: 8192,
    diskSizeMB: 1024,
    envdVersion: '0.1.0',
    public: true,
    templateID: 'data-science-v1',
    createdAt: '2024-01-06T00:00:00Z',
    updatedAt: '2024-01-06T00:00:00Z',
    isDefault: true,
    defaultDescription: 'Data Science Environment with ML Libraries',
    lastSpawnedAt: '2024-01-06T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
]

const TEMPLATES: Template[] = [
  {
    aliases: ['node-typescript', 'node-ts'],
    names: ['node-typescript', 'node-ts'],
    buildID: 'build_001',
    cpuCount: 2,
    memoryMB: 2048,
    diskSizeMB: 2048,
    envdVersion: '0.1.0',
    public: true,
    templateID: 'node-typescript-v1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastSpawnedAt: '2024-01-01T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
  {
    aliases: ['react-vite'],
    names: ['react-vite'],
    buildID: 'build_002',
    cpuCount: 1,
    memoryMB: 1024,
    diskSizeMB: 1536,
    envdVersion: '0.1.0',
    public: true,
    templateID: 'react-vite-v2',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    lastSpawnedAt: '2024-01-02T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
  {
    aliases: ['postgres', 'pg'],
    names: ['postgres', 'pg'],
    buildID: 'build_003',
    cpuCount: 2,
    memoryMB: 4096,
    diskSizeMB: 10240,
    envdVersion: '0.1.0',
    public: false,
    templateID: 'postgres-v15',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
    lastSpawnedAt: '2024-01-03T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
  {
    aliases: ['redis'],
    names: ['redis'],
    buildID: 'build_004',
    cpuCount: 1,
    memoryMB: 2048,
    diskSizeMB: 512,
    envdVersion: '0.1.0',
    public: true,
    templateID: 'redis-v7',
    createdAt: '2024-01-04T00:00:00Z',
    updatedAt: '2024-01-04T00:00:00Z',
    lastSpawnedAt: '2024-01-04T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
  {
    aliases: ['python-ml', 'ml'],
    names: ['python-ml', 'ml'],
    buildID: 'build_005',
    cpuCount: 4,
    memoryMB: 8192,
    diskSizeMB: 5120,
    envdVersion: '0.1.0',
    public: false,
    templateID: 'python-ml-v1',
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z',
    lastSpawnedAt: '2024-01-05T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
  {
    aliases: ['elastic', 'es'],
    names: ['elastic', 'es'],
    buildID: 'build_006',
    cpuCount: 2,
    memoryMB: 4096,
    diskSizeMB: 8192,
    envdVersion: '0.1.0',
    public: true,
    templateID: 'elastic-v8',
    createdAt: '2024-01-06T00:00:00Z',
    updatedAt: '2024-01-06T00:00:00Z',
    lastSpawnedAt: '2024-01-06T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
  {
    aliases: ['grafana'],
    names: ['grafana'],
    buildID: 'build_007',
    cpuCount: 1,
    memoryMB: 2048,
    diskSizeMB: 1024,
    envdVersion: '0.1.0',
    public: true,
    templateID: 'grafana-v9',
    createdAt: '2024-01-07T00:00:00Z',
    updatedAt: '2024-01-07T00:00:00Z',
    lastSpawnedAt: '2024-01-07T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
  {
    aliases: ['nginx'],
    names: ['nginx'],
    buildID: 'build_008',
    cpuCount: 1,
    memoryMB: 1024,
    diskSizeMB: 512,
    public: true,
    envdVersion: '0.1.0',
    templateID: 'nginx-v1',
    createdAt: '2024-01-08T00:00:00Z',
    updatedAt: '2024-01-08T00:00:00Z',
    lastSpawnedAt: '2024-01-08T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
  {
    aliases: ['mongodb', 'mongo'],
    names: ['mongodb', 'mongo'],
    buildID: 'build_009',
    cpuCount: 2,
    memoryMB: 4096,
    diskSizeMB: 10240,
    envdVersion: '0.1.0',
    public: true,
    templateID: 'mongodb-v6',
    createdAt: '2024-01-09T00:00:00Z',
    updatedAt: '2024-01-09T00:00:00Z',
    lastSpawnedAt: '2024-01-09T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
  {
    aliases: ['mysql'],
    names: ['mysql'],
    buildID: 'build_010',
    envdVersion: '0.1.0',
    cpuCount: 2,
    memoryMB: 4096,
    diskSizeMB: 10240,
    public: true,
    templateID: 'mysql-v8',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
    lastSpawnedAt: '2024-01-10T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
  {
    aliases: ['nextjs', 'next'],
    names: ['nextjs', 'next'],
    buildID: 'build_011',
    envdVersion: '0.1.0',
    cpuCount: 2,
    memoryMB: 2048,
    diskSizeMB: 2048,
    public: true,
    templateID: 'nextjs-v14',
    createdAt: '2024-01-11T00:00:00Z',
    updatedAt: '2024-01-11T00:00:00Z',
    lastSpawnedAt: '2024-01-11T00:00:00Z',
    spawnCount: 15,
    buildCount: 1,
  },
  {
    aliases: ['vue', 'vue3'],
    names: ['vue', 'vue3'],
    buildID: 'build_012',
    cpuCount: 1,
    envdVersion: '0.1.0',
    memoryMB: 1024,
    diskSizeMB: 1536,
    public: true,
    templateID: 'vue-v3',
    createdAt: '2024-01-12T00:00:00Z',
    updatedAt: '2024-01-12T00:00:00Z',
    lastSpawnedAt: '2024-01-12T00:00:00Z',
    spawnCount: 8,
    buildCount: 1,
  },
  {
    aliases: ['django'],
    names: ['django'],
    buildID: 'build_013',
    envdVersion: '0.1.0',
    cpuCount: 2,
    memoryMB: 3072,
    diskSizeMB: 2048,
    public: true,
    templateID: 'django-v4',
    createdAt: '2024-01-13T00:00:00Z',
    updatedAt: '2024-01-13T00:00:00Z',
    lastSpawnedAt: '2024-01-13T00:00:00Z',
    spawnCount: 12,
    buildCount: 1,
  },
  {
    aliases: ['flask'],
    names: ['flask'],
    buildID: 'build_014',
    envdVersion: '0.1.0',
    cpuCount: 1,
    memoryMB: 1536,
    diskSizeMB: 1024,
    public: true,
    templateID: 'flask-v2',
    createdAt: '2024-01-14T00:00:00Z',
    updatedAt: '2024-01-14T00:00:00Z',
    lastSpawnedAt: '2024-01-14T00:00:00Z',
    spawnCount: 6,
    buildCount: 1,
  },
  {
    aliases: ['golang', 'go'],
    names: ['golang', 'go'],
    buildID: 'build_015',
    envdVersion: '0.1.0',
    cpuCount: 2,
    memoryMB: 2048,
    diskSizeMB: 2048,
    public: true,
    templateID: 'golang-v1.21',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    lastSpawnedAt: '2024-01-15T00:00:00Z',
    spawnCount: 14,
    buildCount: 1,
  },
  {
    aliases: ['rust'],
    names: ['rust'],
    buildID: 'build_016',
    cpuCount: 2,
    memoryMB: 2048,
    diskSizeMB: 2048,
    public: true,
    envdVersion: '0.1.0',
    templateID: 'rust-v1.75',
    createdAt: '2024-01-16T00:00:00Z',
    updatedAt: '2024-01-16T00:00:00Z',
    lastSpawnedAt: '2024-01-16T00:00:00Z',
    spawnCount: 7,
    buildCount: 1,
  },
  {
    aliases: ['java-spring', 'spring'],
    names: ['java-spring', 'spring'],
    buildID: 'build_017',
    cpuCount: 3,
    memoryMB: 4096,
    diskSizeMB: 3072,
    public: true,
    envdVersion: '0.1.0',
    templateID: 'java-spring-v3',
    createdAt: '2024-01-17T00:00:00Z',
    updatedAt: '2024-01-17T00:00:00Z',
    lastSpawnedAt: '2024-01-17T00:00:00Z',
    spawnCount: 11,
    buildCount: 1,
  },
  {
    aliases: ['dotnet', 'csharp'],
    names: ['dotnet', 'csharp'],
    buildID: 'build_018',
    cpuCount: 2,
    memoryMB: 3072,
    diskSizeMB: 2048,
    public: true,
    envdVersion: '0.1.0',
    templateID: 'dotnet-v8',
    createdAt: '2024-01-18T00:00:00Z',
    updatedAt: '2024-01-18T00:00:00Z',
    lastSpawnedAt: '2024-01-18T00:00:00Z',
    spawnCount: 9,
    buildCount: 1,
  },
  {
    aliases: ['php-laravel', 'laravel'],
    names: ['php-laravel', 'laravel'],
    buildID: 'build_019',
    cpuCount: 2,
    memoryMB: 2048,
    diskSizeMB: 1536,
    public: true,
    envdVersion: '0.1.0',
    templateID: 'php-laravel-v10',
    createdAt: '2024-01-19T00:00:00Z',
    updatedAt: '2024-01-19T00:00:00Z',
    lastSpawnedAt: '2024-01-19T00:00:00Z',
    spawnCount: 5,
    buildCount: 1,
  },
  {
    aliases: ['ruby-rails', 'rails'],
    names: ['ruby-rails', 'rails'],
    buildID: 'build_020',
    cpuCount: 2,
    memoryMB: 2048,
    diskSizeMB: 1536,
    public: true,
    envdVersion: '0.1.0',
    templateID: 'ruby-rails-v7',
    createdAt: '2024-01-20T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z',
    lastSpawnedAt: '2024-01-20T00:00:00Z',
    spawnCount: 4,
    buildCount: 1,
  },
  {
    aliases: ['jupyter', 'notebook'],
    names: ['jupyter', 'notebook'],
    buildID: 'build_021',
    cpuCount: 4,
    memoryMB: 6144,
    diskSizeMB: 4096,
    public: true,
    envdVersion: '0.1.0',
    templateID: 'jupyter-v6',
    createdAt: '2024-01-21T00:00:00Z',
    updatedAt: '2024-01-21T00:00:00Z',
    lastSpawnedAt: '2024-01-21T00:00:00Z',
    spawnCount: 13,
    buildCount: 1,
  },
  {
    aliases: ['tensorflow'],
    names: ['tensorflow'],
    buildID: 'build_022',
    cpuCount: 8,
    memoryMB: 16384,
    diskSizeMB: 10240,
    public: false,
    envdVersion: '0.1.0',
    templateID: 'tensorflow-v2.15',
    createdAt: '2024-01-22T00:00:00Z',
    updatedAt: '2024-01-22T00:00:00Z',
    lastSpawnedAt: '2024-01-22T00:00:00Z',
    spawnCount: 18,
    buildCount: 1,
  },
  {
    aliases: ['pytorch'],
    names: ['pytorch'],
    buildID: 'build_023',
    cpuCount: 8,
    memoryMB: 16384,
    diskSizeMB: 10240,
    public: false,
    envdVersion: '0.1.0',
    templateID: 'pytorch-v2.1',
    createdAt: '2024-01-23T00:00:00Z',
    updatedAt: '2024-01-23T00:00:00Z',
    lastSpawnedAt: '2024-01-23T00:00:00Z',
    spawnCount: 16,
    buildCount: 1,
  },
  {
    aliases: ['cassandra'],
    names: ['cassandra'],
    buildID: 'build_024',
    cpuCount: 4,
    memoryMB: 8192,
    diskSizeMB: 20480,
    public: true,
    envdVersion: '0.1.0',
    templateID: 'cassandra-v4',
    createdAt: '2024-01-24T00:00:00Z',
    updatedAt: '2024-01-24T00:00:00Z',
    lastSpawnedAt: '2024-01-24T00:00:00Z',
    spawnCount: 3,
    buildCount: 1,
  },
  {
    aliases: ['docker', 'dind'],
    names: ['docker', 'dind'],
    buildID: 'build_025',
    cpuCount: 2,
    memoryMB: 4096,
    diskSizeMB: 5120,
    public: true,
    envdVersion: '0.1.0',
    templateID: 'docker-v24',
    createdAt: '2024-01-25T00:00:00Z',
    updatedAt: '2024-01-25T00:00:00Z',
    lastSpawnedAt: '2024-01-25T00:00:00Z',
    spawnCount: 20,
    buildCount: 1,
  },
  {
    aliases: ['kubernetes', 'k8s'],
    names: ['kubernetes', 'k8s'],
    buildID: 'build_026',
    cpuCount: 4,
    memoryMB: 8192,
    diskSizeMB: 10240,
    public: false,
    envdVersion: '0.1.0',
    templateID: 'kubernetes-v1.28',
    createdAt: '2024-01-26T00:00:00Z',
    updatedAt: '2024-01-26T00:00:00Z',
    lastSpawnedAt: '2024-01-26T00:00:00Z',
    spawnCount: 8,
    buildCount: 1,
  },
  {
    aliases: ['terraform'],
    names: ['terraform'],
    buildID: 'build_027',
    cpuCount: 2,
    memoryMB: 2048,
    diskSizeMB: 1024,
    public: true,
    envdVersion: '0.1.0',
    templateID: 'terraform-v1.6',
    createdAt: '2024-01-27T00:00:00Z',
    updatedAt: '2024-01-27T00:00:00Z',
    lastSpawnedAt: '2024-01-27T00:00:00Z',
    spawnCount: 6,
    buildCount: 1,
  },
  {
    aliases: ['ansible'],
    names: ['ansible'],
    buildID: 'build_028',
    cpuCount: 1,
    memoryMB: 1536,
    diskSizeMB: 1024,
    public: true,
    templateID: 'ansible-v2.16',
    createdAt: '2024-01-28T00:00:00Z',
    updatedAt: '2024-01-28T00:00:00Z',
    lastSpawnedAt: '2024-01-28T00:00:00Z',
    envdVersion: '0.1.0',
    spawnCount: 4,
    buildCount: 1,
  },
  {
    aliases: ['prometheus'],
    names: ['prometheus'],
    buildID: 'build_029',
    cpuCount: 2,
    memoryMB: 3072,
    diskSizeMB: 5120,
    public: true,
    templateID: 'prometheus-v2.48',
    envdVersion: '0.1.0',
    createdAt: '2024-01-29T00:00:00Z',
    updatedAt: '2024-01-29T00:00:00Z',
    lastSpawnedAt: '2024-01-29T00:00:00Z',
    spawnCount: 7,
    buildCount: 1,
  },
  {
    aliases: ['jenkins'],
    names: ['jenkins'],
    buildID: 'build_030',
    cpuCount: 3,
    envdVersion: '0.1.0',
    memoryMB: 4096,
    diskSizeMB: 3072,
    public: true,
    templateID: 'jenkins-v2.426',
    createdAt: '2024-01-30T00:00:00Z',
    updatedAt: '2024-01-30T00:00:00Z',
    lastSpawnedAt: '2024-01-30T00:00:00Z',
    spawnCount: 12,
    buildCount: 1,
  },
  {
    aliases: ['gitlab-ci'],
    names: ['gitlab-ci'],
    buildID: 'build_031',
    cpuCount: 2,
    envdVersion: '0.1.0',
    memoryMB: 3072,
    diskSizeMB: 2048,
    public: true,
    templateID: 'gitlab-ci-v16',
    createdAt: '2024-01-31T00:00:00Z',
    updatedAt: '2024-01-31T00:00:00Z',
    lastSpawnedAt: '2024-01-31T00:00:00Z',
    spawnCount: 9,
    buildCount: 1,
  },
  {
    aliases: ['apache-spark', 'spark'],
    names: ['apache-spark', 'spark'],
    buildID: 'build_032',
    cpuCount: 8,
    envdVersion: '0.1.0',
    memoryMB: 12288,
    diskSizeMB: 15360,
    public: false,
    templateID: 'apache-spark-v3.5',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
    lastSpawnedAt: '2024-02-01T00:00:00Z',
    spawnCount: 5,
    buildCount: 1,
  },
  {
    aliases: ['kafka'],
    names: ['kafka'],
    envdVersion: '0.1.0',
    buildID: 'build_033',
    cpuCount: 3,
    memoryMB: 6144,
    diskSizeMB: 10240,
    public: true,
    templateID: 'kafka-v3.6',
    createdAt: '2024-02-02T00:00:00Z',
    updatedAt: '2024-02-02T00:00:00Z',
    lastSpawnedAt: '2024-02-02T00:00:00Z',
    spawnCount: 8,
    buildCount: 1,
  },
  {
    aliases: ['rabbitmq'],
    names: ['rabbitmq'],
    buildID: 'build_034',
    cpuCount: 2,
    memoryMB: 2048,
    diskSizeMB: 2048,
    public: true,
    envdVersion: '0.1.0',
    templateID: 'rabbitmq-v3.12',
    createdAt: '2024-02-03T00:00:00Z',
    updatedAt: '2024-02-03T00:00:00Z',
    lastSpawnedAt: '2024-02-03T00:00:00Z',
    spawnCount: 6,
    buildCount: 1,
  },
  {
    aliases: ['zookeeper'],
    names: ['zookeeper'],
    envdVersion: '0.1.0',
    buildID: 'build_035',
    cpuCount: 1,
    memoryMB: 2048,
    diskSizeMB: 1024,
    public: true,
    templateID: 'zookeeper-v3.9',
    createdAt: '2024-02-04T00:00:00Z',
    updatedAt: '2024-02-04T00:00:00Z',
    lastSpawnedAt: '2024-02-04T00:00:00Z',
    spawnCount: 4,
    buildCount: 1,
  },
  {
    aliases: ['solr'],
    names: ['solr'],
    buildID: 'build_036',
    cpuCount: 2,
    memoryMB: 4096,
    diskSizeMB: 5120,
    public: true,
    envdVersion: '0.1.0',
    templateID: 'solr-v9.4',
    createdAt: '2024-02-05T00:00:00Z',
    updatedAt: '2024-02-05T00:00:00Z',
    lastSpawnedAt: '2024-02-05T00:00:00Z',
    spawnCount: 3,
    buildCount: 1,
  },
  {
    aliases: ['logstash'],
    names: ['logstash'],
    buildID: 'build_037',
    cpuCount: 2,
    memoryMB: 3072,
    diskSizeMB: 2048,
    public: true,
    templateID: 'logstash-v8.11',
    createdAt: '2024-02-06T00:00:00Z',
    envdVersion: '0.1.0',
    updatedAt: '2024-02-06T00:00:00Z',
    lastSpawnedAt: '2024-02-06T00:00:00Z',
    spawnCount: 5,
    buildCount: 1,
  },
  {
    aliases: ['kibana'],
    names: ['kibana'],
    buildID: 'build_038',
    cpuCount: 1,
    memoryMB: 2048,
    diskSizeMB: 1024,
    public: true,
    templateID: 'kibana-v8.11',
    createdAt: '2024-02-07T00:00:00Z',
    updatedAt: '2024-02-07T00:00:00Z',
    lastSpawnedAt: '2024-02-07T00:00:00Z',
    spawnCount: 7,
    buildCount: 1,
    envdVersion: '0.1.0',
  },
  {
    aliases: ['minio'],
    names: ['minio'],
    buildID: 'build_039',
    cpuCount: 2,
    memoryMB: 2048,
    diskSizeMB: 5120,
    public: true,
    templateID: 'minio-v2024',
    createdAt: '2024-02-08T00:00:00Z',
    envdVersion: '0.1.0',
    updatedAt: '2024-02-08T00:00:00Z',
    lastSpawnedAt: '2024-02-08T00:00:00Z',
    spawnCount: 6,
    buildCount: 1,
  },
  {
    aliases: ['vault'],
    names: ['vault'],
    buildID: 'build_040',
    cpuCount: 1,
    envdVersion: '0.1.0',
    memoryMB: 1536,
    diskSizeMB: 1024,
    public: false,
    templateID: 'vault-v1.15',
    createdAt: '2024-02-09T00:00:00Z',
    updatedAt: '2024-02-09T00:00:00Z',
    lastSpawnedAt: '2024-02-09T00:00:00Z',
    spawnCount: 4,
    buildCount: 1,
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

function generateMockSandboxes(count: number): Sandboxes {
  const sandboxes: Sandboxes = []
  const baseDate = new Date()

  for (let i = 0; i < count; i++) {
    const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)]!
    const env = ENVIRONMENTS[Math.floor(Math.random() * ENVIRONMENTS.length)]!
    const component = COMPONENTS[Math.floor(Math.random() * COMPONENTS.length)]!

    // Distribute sandboxes randomly within 24 hours from the base date
    const startDate = subHours(baseDate, Math.floor(Math.random() * 30))
    const endDate = addHours(startDate, 24)

    // Random memory and CPU from template's allowed values; mock templates
    // always carry real specs, so default the (now-nullable) fields here.
    const memory = template.memoryMB ?? 2048
    const cpu = template.cpuCount ?? 2

    sandboxes.push({
      alias: `${env}-${component}-${nanoid(4)}`,
      clientID: nanoid(8),
      cpuCount: cpu,
      endAt: endDate.toISOString(),
      memoryMB: memory,
      diskSizeMB: template.diskSizeMB ?? 1024,
      envdVersion: template.envdVersion ?? '0.1.0',
      metadata: {
        lastUpdate: new Date(
          startDate.getTime() + 2 * 60 * 60 * 1000
        ).toISOString(),
        status: JSON.stringify({
          health: ['healthy', 'degraded', 'warning', 'error'][
            Math.floor(Math.random() * 4)
          ],
          uptime: Math.floor(Math.random() * 1000000),
          restarts: Math.floor(Math.random() * 5),
        }),
        network: JSON.stringify({
          ingressBytes: Math.floor(Math.random() * 1024 * 1024 * 1024),
          egressBytes: Math.floor(Math.random() * 1024 * 1024 * 1024),
          connections: Math.floor(Math.random() * 1000),
          ports: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () =>
            Math.floor(Math.random() * 65535)
          ),
        }),
        config: JSON.stringify({
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
        }),
        deployment: JSON.stringify({
          version: `v${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
          commitHash: nanoid(7),
          deployedBy: `user_${nanoid(4)}`,
          deployedAt: new Date(
            startDate.getTime() + Math.floor(Math.random() * 60 * 60 * 1000)
          ).toISOString(),
        }),
        resources: JSON.stringify({
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
        }),
      },
      sandboxID: nanoid(8),
      startedAt: startDate.toISOString(),
      templateID: template.templateID,
      state: 'running',
      volumeMounts: [],
    })
  }

  return sandboxes
}

function generateMockMetrics(sandboxes: Sandbox[]): {
  metrics: ClientSandboxesMetrics
} {
  const metrics: ClientSandboxesMetrics = {}

  // Define characteristics by template type
  const templatePatterns: Record<
    string,
    { memoryProfile: string; cpuIntensity: number; diskGb: number }
  > = {
    'node-typescript-v1': {
      memoryProfile: 'web',
      cpuIntensity: 0.4,
      diskGb: 0,
    },
    'react-vite-v2': { memoryProfile: 'web', cpuIntensity: 0.5, diskGb: 10 },
    'postgres-v15': {
      memoryProfile: 'database',
      cpuIntensity: 0.6,
      diskGb: 100,
    },
    'redis-v7': { memoryProfile: 'cache', cpuIntensity: 0.2, diskGb: 20 },
    'python-ml-v1': { memoryProfile: 'ml', cpuIntensity: 0.9, diskGb: 50 },
    'elastic-v8': { memoryProfile: 'search', cpuIntensity: 0.7, diskGb: 80 },
    'grafana-v9': {
      memoryProfile: 'visualization',
      cpuIntensity: 0.3,
      diskGb: 15,
    },
    'nginx-v1': { memoryProfile: 'web', cpuIntensity: 0.2, diskGb: 0 },
    'mongodb-v6': { memoryProfile: 'database', cpuIntensity: 0.5, diskGb: 100 },
    'mysql-v8': { memoryProfile: 'database', cpuIntensity: 0.6, diskGb: 100 },
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

  const diskBaselines: Record<string, number> = {
    web: 0.1,
    database: 0.5,
    cache: 0.05,
    ml: 0.4,
    search: 0.3,
    visualization: 0.2,
  }
  const diskVolatility: Record<string, number> = {
    web: 0.2,
    database: 0.15,
    cache: 0.1,
    ml: 0.3,
    search: 0.25,
    visualization: 0.15,
  }

  for (const sandbox of sandboxes) {
    const pattern = templatePatterns[sandbox.templateID] || {
      memoryProfile: 'web',
      cpuIntensity: 0.5,
      diskGb: 20,
    }

    const memBaseline = memoryBaselines[pattern.memoryProfile]!
    const memVolatility = memoryVolatility[pattern.memoryProfile]!

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
    const memUsedMb = Math.floor(sandbox.memoryMB * Math.min(1.0, memPct))
    const diskBaseline = diskBaselines[pattern.memoryProfile]!
    const diskVolatilityVal = diskVolatility[pattern.memoryProfile]!
    const diskNoise = (Math.random() - 0.5) * 0.1
    const diskPct = diskBaseline + baseLoad * diskVolatilityVal + diskNoise
    // Use sandbox's declared disk size (in MB) as the total capacity
    const sandboxDiskTotalGb = (sandbox.diskSizeMB ?? 0) / 1024
    const clampedDiskPct = Math.min(1, Math.max(0, diskPct))
    const diskUsedGb = Number((sandboxDiskTotalGb * clampedDiskPct).toFixed(2))
    const diskTotalGb = Number(sandboxDiskTotalGb.toFixed(2))

    metrics[sandbox.sandboxID] = {
      cpuCount: sandbox.cpuCount,
      cpuUsedPct,
      memTotalMb: sandbox.memoryMB,
      memUsedMb: memUsedMb,
      timestamp: new Date().toISOString(),
      diskUsedGb,
      diskTotalGb,
    }
  }

  return {
    metrics,
  }
}

/**
 * This function replicates the back-end step calculation logic from e2b-dev/infra.
 * https://github.com/e2b-dev/infra/blob/19778a715e8df3adea83858c798582d289bd7159/packages/api/internal/handlers/sandbox_metrics.go#L90
 */
export const MOCK_SANDBOXES_DATA = () => generateMockSandboxes(120)
export const MOCK_TEMPLATES_DATA = TEMPLATES
export const MOCK_DEFAULT_TEMPLATES_DATA = DEFAULT_TEMPLATES
