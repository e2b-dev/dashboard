import { MetricsResponse } from '@/app/api/teams/[teamId]/sandboxes/metrics/types'
import { DefaultTemplate, Sandbox, Sandboxes, Template } from '@/types/api'
import {
  ClientSandboxesMetrics,
  ClientTeamMetrics,
} from '@/types/sandboxes.types'
import { addHours, subHours } from 'date-fns'
import { nanoid } from 'nanoid'

const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    aliases: ['code-interpreter'],
    buildID: 'build_000',
    cpuCount: 1,
    memoryMB: 1024,
    diskSizeMB: 1024,
    envdVersion: '0.1.0',
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
    lastSpawnedAt: '2024-01-01T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
  {
    aliases: ['web-starter'],
    buildID: 'build_005',
    cpuCount: 2,
    memoryMB: 2048,
    diskSizeMB: 1024,
    envdVersion: '0.1.0',
    public: true,
    templateID: 'web-starter-v1',
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z',
    createdBy: null,
    isDefault: true,
    defaultDescription: 'Web Development Environment',
    lastSpawnedAt: '2024-01-05T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
  {
    aliases: ['data-science'],
    buildID: 'build_006',
    cpuCount: 4,
    memoryMB: 8192,
    diskSizeMB: 1024,
    envdVersion: '0.1.0',
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
    lastSpawnedAt: '2024-01-06T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
]

const TEMPLATES: Template[] = [
  {
    aliases: ['node-typescript', 'node-ts'],
    buildID: 'build_001',
    cpuCount: 2,
    memoryMB: 2048,
    diskSizeMB: 2048,
    envdVersion: '0.1.0',
    public: true,
    templateID: 'node-typescript-v1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: {
      email: 'admin@example.com',
      id: 'user_001',
    },
    lastSpawnedAt: '2024-01-01T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
  {
    aliases: ['react-vite'],
    buildID: 'build_002',
    cpuCount: 1,
    memoryMB: 1024,
    diskSizeMB: 1536,
    envdVersion: '0.1.0',
    public: true,
    templateID: 'react-vite-v2',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    createdBy: null,
    lastSpawnedAt: '2024-01-02T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
  {
    aliases: ['postgres', 'pg'],
    buildID: 'build_003',
    cpuCount: 2,
    memoryMB: 4096,
    diskSizeMB: 10240,
    envdVersion: '0.1.0',
    public: false,
    templateID: 'postgres-v15',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
    createdBy: null,
    lastSpawnedAt: '2024-01-03T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
  {
    aliases: ['redis'],
    buildID: 'build_004',
    cpuCount: 1,
    memoryMB: 2048,
    diskSizeMB: 512,
    envdVersion: '0.1.0',
    public: true,
    templateID: 'redis-v7',
    createdAt: '2024-01-04T00:00:00Z',
    updatedAt: '2024-01-04T00:00:00Z',
    createdBy: null,
    lastSpawnedAt: '2024-01-04T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
  {
    aliases: ['python-ml', 'ml'],
    buildID: 'build_005',
    cpuCount: 4,
    memoryMB: 8192,
    diskSizeMB: 5120,
    envdVersion: '0.1.0',
    public: false,
    templateID: 'python-ml-v1',
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z',
    createdBy: null,
    lastSpawnedAt: '2024-01-05T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
  {
    aliases: ['elastic', 'es'],
    buildID: 'build_006',
    cpuCount: 2,
    memoryMB: 4096,
    diskSizeMB: 8192,
    envdVersion: '0.1.0',
    public: true,
    templateID: 'elastic-v8',
    createdAt: '2024-01-06T00:00:00Z',
    updatedAt: '2024-01-06T00:00:00Z',
    createdBy: null,
    lastSpawnedAt: '2024-01-06T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
  {
    aliases: ['grafana'],
    buildID: 'build_007',
    cpuCount: 1,
    memoryMB: 2048,
    diskSizeMB: 1024,
    envdVersion: '0.1.0',
    public: true,
    templateID: 'grafana-v9',
    createdAt: '2024-01-07T00:00:00Z',
    updatedAt: '2024-01-07T00:00:00Z',
    createdBy: null,
    lastSpawnedAt: '2024-01-07T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
  {
    aliases: ['nginx'],
    buildID: 'build_008',
    cpuCount: 1,
    memoryMB: 1024,
    diskSizeMB: 512,
    public: true,
    envdVersion: '0.1.0',
    templateID: 'nginx-v1',
    createdAt: '2024-01-08T00:00:00Z',
    updatedAt: '2024-01-08T00:00:00Z',
    createdBy: null,
    lastSpawnedAt: '2024-01-08T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
  {
    aliases: ['mongodb', 'mongo'],
    buildID: 'build_009',
    cpuCount: 2,
    memoryMB: 4096,
    diskSizeMB: 10240,
    envdVersion: '0.1.0',
    public: true,
    templateID: 'mongodb-v6',
    createdAt: '2024-01-09T00:00:00Z',
    updatedAt: '2024-01-09T00:00:00Z',
    createdBy: null,
    lastSpawnedAt: '2024-01-09T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
  {
    aliases: ['mysql'],
    buildID: 'build_010',
    envdVersion: '0.1.0',
    cpuCount: 2,
    memoryMB: 4096,
    diskSizeMB: 10240,
    public: true,
    templateID: 'mysql-v8',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
    createdBy: null,
    lastSpawnedAt: '2024-01-10T00:00:00Z',
    spawnCount: 10,
    buildCount: 1,
  },
  {
    aliases: ['nextjs', 'next'],
    buildID: 'build_011',
    envdVersion: '0.1.0',
    cpuCount: 2,
    memoryMB: 2048,
    diskSizeMB: 2048,
    public: true,
    templateID: 'nextjs-v14',
    createdAt: '2024-01-11T00:00:00Z',
    updatedAt: '2024-01-11T00:00:00Z',
    createdBy: {
      email: 'frontend@example.com',
      id: 'user_003',
    },
    lastSpawnedAt: '2024-01-11T00:00:00Z',
    spawnCount: 15,
    buildCount: 1,
  },
  {
    aliases: ['vue', 'vue3'],
    buildID: 'build_012',
    cpuCount: 1,
    envdVersion: '0.1.0',
    memoryMB: 1024,
    diskSizeMB: 1536,
    public: true,
    templateID: 'vue-v3',
    createdAt: '2024-01-12T00:00:00Z',
    updatedAt: '2024-01-12T00:00:00Z',
    createdBy: null,
    lastSpawnedAt: '2024-01-12T00:00:00Z',
    spawnCount: 8,
    buildCount: 1,
  },
  {
    aliases: ['django'],
    buildID: 'build_013',
    envdVersion: '0.1.0',
    cpuCount: 2,
    memoryMB: 3072,
    diskSizeMB: 2048,
    public: true,
    templateID: 'django-v4',
    createdAt: '2024-01-13T00:00:00Z',
    updatedAt: '2024-01-13T00:00:00Z',
    createdBy: {
      email: 'python@example.com',
      id: 'user_004',
    },
    lastSpawnedAt: '2024-01-13T00:00:00Z',
    spawnCount: 12,
    buildCount: 1,
  },
  {
    aliases: ['flask'],
    buildID: 'build_014',
    envdVersion: '0.1.0',
    cpuCount: 1,
    memoryMB: 1536,
    diskSizeMB: 1024,
    public: true,
    templateID: 'flask-v2',
    createdAt: '2024-01-14T00:00:00Z',
    updatedAt: '2024-01-14T00:00:00Z',
    createdBy: null,
    lastSpawnedAt: '2024-01-14T00:00:00Z',
    spawnCount: 6,
    buildCount: 1,
  },
  {
    aliases: ['golang', 'go'],
    buildID: 'build_015',
    envdVersion: '0.1.0',
    cpuCount: 2,
    memoryMB: 2048,
    diskSizeMB: 2048,
    public: true,
    templateID: 'golang-v1.21',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    createdBy: {
      email: 'go@example.com',
      id: 'user_005',
    },
    lastSpawnedAt: '2024-01-15T00:00:00Z',
    spawnCount: 14,
    buildCount: 1,
  },
  {
    aliases: ['rust'],
    buildID: 'build_016',
    cpuCount: 2,
    memoryMB: 2048,
    diskSizeMB: 2048,
    public: true,
    envdVersion: '0.1.0',
    templateID: 'rust-v1.75',
    createdAt: '2024-01-16T00:00:00Z',
    updatedAt: '2024-01-16T00:00:00Z',
    createdBy: null,
    lastSpawnedAt: '2024-01-16T00:00:00Z',
    spawnCount: 7,
    buildCount: 1,
  },
  {
    aliases: ['java-spring', 'spring'],
    buildID: 'build_017',
    cpuCount: 3,
    memoryMB: 4096,
    diskSizeMB: 3072,
    public: true,
    envdVersion: '0.1.0',
    templateID: 'java-spring-v3',
    createdAt: '2024-01-17T00:00:00Z',
    updatedAt: '2024-01-17T00:00:00Z',
    createdBy: {
      email: 'java@example.com',
      id: 'user_006',
    },
    lastSpawnedAt: '2024-01-17T00:00:00Z',
    spawnCount: 11,
    buildCount: 1,
  },
  {
    aliases: ['dotnet', 'csharp'],
    buildID: 'build_018',
    cpuCount: 2,
    memoryMB: 3072,
    diskSizeMB: 2048,
    public: true,
    envdVersion: '0.1.0',
    templateID: 'dotnet-v8',
    createdAt: '2024-01-18T00:00:00Z',
    updatedAt: '2024-01-18T00:00:00Z',
    createdBy: null,
    lastSpawnedAt: '2024-01-18T00:00:00Z',
    spawnCount: 9,
    buildCount: 1,
  },
  {
    aliases: ['php-laravel', 'laravel'],
    buildID: 'build_019',
    cpuCount: 2,
    memoryMB: 2048,
    diskSizeMB: 1536,
    public: true,
    envdVersion: '0.1.0',
    templateID: 'php-laravel-v10',
    createdAt: '2024-01-19T00:00:00Z',
    updatedAt: '2024-01-19T00:00:00Z',
    createdBy: {
      email: 'php@example.com',
      id: 'user_007',
    },
    lastSpawnedAt: '2024-01-19T00:00:00Z',
    spawnCount: 5,
    buildCount: 1,
  },
  {
    aliases: ['ruby-rails', 'rails'],
    buildID: 'build_020',
    cpuCount: 2,
    memoryMB: 2048,
    diskSizeMB: 1536,
    public: true,
    envdVersion: '0.1.0',
    templateID: 'ruby-rails-v7',
    createdAt: '2024-01-20T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z',
    createdBy: null,
    lastSpawnedAt: '2024-01-20T00:00:00Z',
    spawnCount: 4,
    buildCount: 1,
  },
  {
    aliases: ['jupyter', 'notebook'],
    buildID: 'build_021',
    cpuCount: 4,
    memoryMB: 6144,
    diskSizeMB: 4096,
    public: true,
    envdVersion: '0.1.0',
    templateID: 'jupyter-v6',
    createdAt: '2024-01-21T00:00:00Z',
    updatedAt: '2024-01-21T00:00:00Z',
    createdBy: {
      email: 'datascience@example.com',
      id: 'user_008',
    },
    lastSpawnedAt: '2024-01-21T00:00:00Z',
    spawnCount: 13,
    buildCount: 1,
  },
  {
    aliases: ['tensorflow'],
    buildID: 'build_022',
    cpuCount: 8,
    memoryMB: 16384,
    diskSizeMB: 10240,
    public: false,
    envdVersion: '0.1.0',
    templateID: 'tensorflow-v2.15',
    createdAt: '2024-01-22T00:00:00Z',
    updatedAt: '2024-01-22T00:00:00Z',
    createdBy: {
      email: 'ml@example.com',
      id: 'user_009',
    },
    lastSpawnedAt: '2024-01-22T00:00:00Z',
    spawnCount: 18,
    buildCount: 1,
  },
  {
    aliases: ['pytorch'],
    buildID: 'build_023',
    cpuCount: 8,
    memoryMB: 16384,
    diskSizeMB: 10240,
    public: false,
    envdVersion: '0.1.0',
    templateID: 'pytorch-v2.1',
    createdAt: '2024-01-23T00:00:00Z',
    updatedAt: '2024-01-23T00:00:00Z',
    createdBy: {
      email: 'ml@example.com',
      id: 'user_009',
    },
    lastSpawnedAt: '2024-01-23T00:00:00Z',
    spawnCount: 16,
    buildCount: 1,
  },
  {
    aliases: ['cassandra'],
    buildID: 'build_024',
    cpuCount: 4,
    memoryMB: 8192,
    diskSizeMB: 20480,
    public: true,
    envdVersion: '0.1.0',
    templateID: 'cassandra-v4',
    createdAt: '2024-01-24T00:00:00Z',
    updatedAt: '2024-01-24T00:00:00Z',
    createdBy: null,
    lastSpawnedAt: '2024-01-24T00:00:00Z',
    spawnCount: 3,
    buildCount: 1,
  },
  {
    aliases: ['docker', 'dind'],
    buildID: 'build_025',
    cpuCount: 2,
    memoryMB: 4096,
    diskSizeMB: 5120,
    public: true,
    envdVersion: '0.1.0',
    templateID: 'docker-v24',
    createdAt: '2024-01-25T00:00:00Z',
    updatedAt: '2024-01-25T00:00:00Z',
    createdBy: {
      email: 'devops@example.com',
      id: 'user_010',
    },
    lastSpawnedAt: '2024-01-25T00:00:00Z',
    spawnCount: 20,
    buildCount: 1,
  },
  {
    aliases: ['kubernetes', 'k8s'],
    buildID: 'build_026',
    cpuCount: 4,
    memoryMB: 8192,
    diskSizeMB: 10240,
    public: false,
    envdVersion: '0.1.0',
    templateID: 'kubernetes-v1.28',
    createdAt: '2024-01-26T00:00:00Z',
    updatedAt: '2024-01-26T00:00:00Z',
    createdBy: {
      email: 'devops@example.com',
      id: 'user_010',
    },
    lastSpawnedAt: '2024-01-26T00:00:00Z',
    spawnCount: 8,
    buildCount: 1,
  },
  {
    aliases: ['terraform'],
    buildID: 'build_027',
    cpuCount: 2,
    memoryMB: 2048,
    diskSizeMB: 1024,
    public: true,
    envdVersion: '0.1.0',
    templateID: 'terraform-v1.6',
    createdAt: '2024-01-27T00:00:00Z',
    updatedAt: '2024-01-27T00:00:00Z',
    createdBy: null,
    lastSpawnedAt: '2024-01-27T00:00:00Z',
    spawnCount: 6,
    buildCount: 1,
  },
  {
    aliases: ['ansible'],
    buildID: 'build_028',
    cpuCount: 1,
    memoryMB: 1536,
    diskSizeMB: 1024,
    public: true,
    templateID: 'ansible-v2.16',
    createdAt: '2024-01-28T00:00:00Z',
    updatedAt: '2024-01-28T00:00:00Z',
    createdBy: {
      email: 'devops@example.com',
      id: 'user_010',
    },
    lastSpawnedAt: '2024-01-28T00:00:00Z',
    envdVersion: '0.1.0',
    spawnCount: 4,
    buildCount: 1,
  },
  {
    aliases: ['prometheus'],
    buildID: 'build_029',
    cpuCount: 2,
    memoryMB: 3072,
    diskSizeMB: 5120,
    public: true,
    templateID: 'prometheus-v2.48',
    envdVersion: '0.1.0',
    createdAt: '2024-01-29T00:00:00Z',
    updatedAt: '2024-01-29T00:00:00Z',
    createdBy: null,
    lastSpawnedAt: '2024-01-29T00:00:00Z',
    spawnCount: 7,
    buildCount: 1,
  },
  {
    aliases: ['jenkins'],
    buildID: 'build_030',
    cpuCount: 3,
    envdVersion: '0.1.0',
    memoryMB: 4096,
    diskSizeMB: 3072,
    public: true,
    templateID: 'jenkins-v2.426',
    createdAt: '2024-01-30T00:00:00Z',
    updatedAt: '2024-01-30T00:00:00Z',
    createdBy: {
      email: 'ci@example.com',
      id: 'user_011',
    },
    lastSpawnedAt: '2024-01-30T00:00:00Z',
    spawnCount: 12,
    buildCount: 1,
  },
  {
    aliases: ['gitlab-ci'],
    buildID: 'build_031',
    cpuCount: 2,
    envdVersion: '0.1.0',
    memoryMB: 3072,
    diskSizeMB: 2048,
    public: true,
    templateID: 'gitlab-ci-v16',
    createdAt: '2024-01-31T00:00:00Z',
    updatedAt: '2024-01-31T00:00:00Z',
    createdBy: null,
    lastSpawnedAt: '2024-01-31T00:00:00Z',
    spawnCount: 9,
    buildCount: 1,
  },
  {
    aliases: ['apache-spark', 'spark'],
    buildID: 'build_032',
    cpuCount: 8,
    envdVersion: '0.1.0',
    memoryMB: 12288,
    diskSizeMB: 15360,
    public: false,
    templateID: 'apache-spark-v3.5',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
    createdBy: {
      email: 'bigdata@example.com',
      id: 'user_012',
    },
    lastSpawnedAt: '2024-02-01T00:00:00Z',
    spawnCount: 5,
    buildCount: 1,
  },
  {
    aliases: ['kafka'],
    envdVersion: '0.1.0',
    buildID: 'build_033',
    cpuCount: 3,
    memoryMB: 6144,
    diskSizeMB: 10240,
    public: true,
    templateID: 'kafka-v3.6',
    createdAt: '2024-02-02T00:00:00Z',
    updatedAt: '2024-02-02T00:00:00Z',
    createdBy: null,
    lastSpawnedAt: '2024-02-02T00:00:00Z',
    spawnCount: 8,
    buildCount: 1,
  },
  {
    aliases: ['rabbitmq'],
    buildID: 'build_034',
    cpuCount: 2,
    memoryMB: 2048,
    diskSizeMB: 2048,
    public: true,
    envdVersion: '0.1.0',
    templateID: 'rabbitmq-v3.12',
    createdAt: '2024-02-03T00:00:00Z',
    updatedAt: '2024-02-03T00:00:00Z',
    createdBy: {
      email: 'messaging@example.com',
      id: 'user_013',
    },
    lastSpawnedAt: '2024-02-03T00:00:00Z',
    spawnCount: 6,
    buildCount: 1,
  },
  {
    aliases: ['zookeeper'],
    envdVersion: '0.1.0',
    buildID: 'build_035',
    cpuCount: 1,
    memoryMB: 2048,
    diskSizeMB: 1024,
    public: true,
    templateID: 'zookeeper-v3.9',
    createdAt: '2024-02-04T00:00:00Z',
    updatedAt: '2024-02-04T00:00:00Z',
    createdBy: null,
    lastSpawnedAt: '2024-02-04T00:00:00Z',
    spawnCount: 4,
    buildCount: 1,
  },
  {
    aliases: ['solr'],
    buildID: 'build_036',
    cpuCount: 2,
    memoryMB: 4096,
    diskSizeMB: 5120,
    public: true,
    envdVersion: '0.1.0',
    templateID: 'solr-v9.4',
    createdAt: '2024-02-05T00:00:00Z',
    updatedAt: '2024-02-05T00:00:00Z',
    createdBy: {
      email: 'search@example.com',
      id: 'user_014',
    },
    lastSpawnedAt: '2024-02-05T00:00:00Z',
    spawnCount: 3,
    buildCount: 1,
  },
  {
    aliases: ['logstash'],
    buildID: 'build_037',
    cpuCount: 2,
    memoryMB: 3072,
    diskSizeMB: 2048,
    public: true,
    templateID: 'logstash-v8.11',
    createdAt: '2024-02-06T00:00:00Z',
    envdVersion: '0.1.0',
    updatedAt: '2024-02-06T00:00:00Z',
    createdBy: null,
    lastSpawnedAt: '2024-02-06T00:00:00Z',
    spawnCount: 5,
    buildCount: 1,
  },
  {
    aliases: ['kibana'],
    buildID: 'build_038',
    cpuCount: 1,
    memoryMB: 2048,
    diskSizeMB: 1024,
    public: true,
    templateID: 'kibana-v8.11',
    createdAt: '2024-02-07T00:00:00Z',
    updatedAt: '2024-02-07T00:00:00Z',
    createdBy: null,
    lastSpawnedAt: '2024-02-07T00:00:00Z',
    spawnCount: 7,
    buildCount: 1,
    envdVersion: '0.1.0',
  },
  {
    aliases: ['minio'],
    buildID: 'build_039',
    cpuCount: 2,
    memoryMB: 2048,
    diskSizeMB: 5120,
    public: true,
    templateID: 'minio-v2024',
    createdAt: '2024-02-08T00:00:00Z',
    envdVersion: '0.1.0',
    updatedAt: '2024-02-08T00:00:00Z',
    createdBy: {
      email: 'storage@example.com',
      id: 'user_015',
    },
    lastSpawnedAt: '2024-02-08T00:00:00Z',
    spawnCount: 6,
    buildCount: 1,
  },
  {
    aliases: ['vault'],
    buildID: 'build_040',
    cpuCount: 1,
    envdVersion: '0.1.0',
    memoryMB: 1536,
    diskSizeMB: 1024,
    public: false,
    templateID: 'vault-v1.15',
    createdAt: '2024-02-09T00:00:00Z',
    updatedAt: '2024-02-09T00:00:00Z',
    createdBy: {
      email: 'security@example.com',
      id: 'user_016',
    },
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

    // Random memory and CPU from template's allowed values
    const memory = template.memoryMB
    const cpu = template.cpuCount

    sandboxes.push({
      alias: `${env}-${component}-${nanoid(4)}`,
      clientID: nanoid(8),
      cpuCount: cpu,
      endAt: endDate.toISOString(),
      memoryMB: memory,
      diskSizeMB: template.diskSizeMB,
      envdVersion: template.envdVersion,
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
    })
  }

  return sandboxes
}

function generateMockMetrics(sandboxes: Sandbox[]): MetricsResponse {
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
export function calculateTeamMetricsStep(
  startMs: number,
  endMs: number
): number {
  const duration = endMs - startMs
  const hour = 60 * 60 * 1000
  const minute = 60 * 1000
  const second = 1000

  switch (true) {
    case duration < hour:
      return 5 * second
    case duration < 6 * hour:
      return 30 * second
    case duration < 12 * hour:
      return minute
    case duration < 24 * hour:
      return 2 * minute
    case duration < 7 * 24 * hour:
      return 5 * minute
    default:
      return 15 * minute
  }
}

/**
 * Generate mock team metrics for monitoring charts
 * Supports small, medium, and large teams with realistic patterns
 * Can generate data for the past 30 days from now
 */
export function generateMockTeamMetrics(
  startMs: number,
  endMs: number
): { metrics: ClientTeamMetrics; step: number } {
  const now = Date.now()
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

  // Clamp start time to no earlier than 30 days ago
  if (startMs < thirtyDaysAgo) {
    startMs = thirtyDaysAgo
  }

  // Don't generate data beyond current time
  if (endMs > now) {
    endMs = now
  }
  const profiles = {
    small: {
      baseConcurrent: 50,
      peakConcurrent: 200,
      baseRate: 0.1,
      peakRate: 2,
      volatility: 0.15,
    },
    medium: {
      baseConcurrent: 500,
      peakConcurrent: 5000,
      baseRate: 1,
      peakRate: 10,
      volatility: 0.2,
    },
    large: {
      baseConcurrent: 20000,
      peakConcurrent: 80000,
      baseRate: 5,
      peakRate: 25,
      volatility: 0.25,
    },
  }

  const profile = profiles.large
  const metrics: ClientTeamMetrics = []

  // Use the backend's step calculation logic
  const step = calculateTeamMetricsStep(startMs, endMs)

  // Normalize start time based on step size
  let normalizedStartMs: number
  const second = 1000
  const minute = 60 * second

  if (step < minute) {
    // For steps less than a minute, normalize to nearest step boundary
    if (step === 5 * second) {
      // Normalize to nearest 5 seconds
      normalizedStartMs = Math.floor(startMs / (5 * second)) * (5 * second)
    } else if (step === 30 * second) {
      // Normalize to 00 or 30 seconds
      normalizedStartMs = Math.floor(startMs / (30 * second)) * (30 * second)
    } else {
      normalizedStartMs = startMs
    }
  } else {
    // For minute-based steps, normalize to the minute
    normalizedStartMs = Math.floor(startMs / minute) * minute
  }

  // Calculate normalized end time to ensure we generate data up to "now" or requested end
  let normalizedEndMs: number
  if (step < minute) {
    if (step === 5 * second) {
      normalizedEndMs = Math.floor(endMs / (5 * second)) * (5 * second)
    } else if (step === 30 * second) {
      normalizedEndMs = Math.floor(endMs / (30 * second)) * (30 * second)
    } else {
      normalizedEndMs = endMs
    }
  } else {
    normalizedEndMs = Math.floor(endMs / minute) * minute
  }

  const durationMs = normalizedEndMs - normalizedStartMs
  let numPoints = Math.floor(durationMs / step) + 1 // +1 to include the end point

  // Cap number of points for performance
  numPoints = Math.min(numPoints, 2000)

  // Generate realistic patterns
  for (let i = 0; i < numPoints; i++) {
    const timestamp = normalizedStartMs + i * step

    // Don't generate points beyond the normalized end time or current time
    if (timestamp > normalizedEndMs || timestamp > now) break

    const date = new Date(timestamp)

    // Time-based patterns
    const hourOfDay = date.getHours()
    const dayOfWeek = date.getDay()
    const minuteOfHour = date.getMinutes()

    // Business hours factor (9-17 in user's timezone)
    const isBusinessHours = hourOfDay >= 9 && hourOfDay <= 17
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5

    // Calculate load factors
    let loadFactor = 0.3 // base load

    if (isWeekday) {
      if (isBusinessHours) {
        // Peak during business hours
        loadFactor = 0.7 + Math.sin(((hourOfDay - 9) * Math.PI) / 8) * 0.3

        // Add lunch dip
        if (hourOfDay === 12 || hourOfDay === 13) {
          loadFactor *= 0.85
        }
      } else if (hourOfDay >= 6 && hourOfDay < 9) {
        // Morning ramp-up
        loadFactor = 0.3 + (hourOfDay - 6) * 0.15
      } else if (hourOfDay > 17 && hourOfDay <= 20) {
        // Evening wind-down
        loadFactor = 0.7 - (hourOfDay - 17) * 0.1
      } else {
        // Night time
        loadFactor = 0.2 + Math.random() * 0.1
      }
    } else {
      // Weekend - lower but some activity
      loadFactor = 0.15 + Math.sin((hourOfDay * Math.PI) / 12) * 0.1
    }

    // Add some micro-patterns (spikes and dips)
    const microPattern = Math.sin((minuteOfHour * Math.PI) / 30) * 0.05
    loadFactor += microPattern

    // Add random volatility
    const randomVolatility = (Math.random() - 0.5) * profile.volatility
    loadFactor = Math.max(0.1, Math.min(1, loadFactor + randomVolatility))

    // Calculate metrics based on load
    const concurrentSandboxes = Math.round(
      profile.baseConcurrent +
        (profile.peakConcurrent - profile.baseConcurrent) * loadFactor
    )

    // Start rate has higher volatility and spikiness
    const rateVolatility = (Math.random() - 0.5) * profile.volatility * 2
    const startRateFactor = Math.max(0, loadFactor + rateVolatility)

    // Add occasional spikes in start rate (deployments, CI/CD runs)
    const hasSpike = Math.random() < 0.02 // 2% chance of spike
    const spikeFactor = hasSpike ? 1.5 + Math.random() : 1

    const sandboxStartRate = Math.max(
      0,
      (profile.baseRate +
        (profile.peakRate - profile.baseRate) * startRateFactor) *
        spikeFactor
    )

    metrics.push({
      timestamp,
      concurrentSandboxes,
      sandboxStartRate: Math.round(sandboxStartRate * 100) / 100, // Round to 2 decimals
    })
  }

  // Add some smoothing to make it more realistic
  for (let i = 1; i < metrics.length - 1; i++) {
    const prev = metrics[i - 1]!
    const curr = metrics[i]!
    const next = metrics[i + 1]!

    // Smooth concurrent sandboxes (they change more gradually)
    curr.concurrentSandboxes = Math.round(
      prev.concurrentSandboxes * 0.3 +
        curr.concurrentSandboxes * 0.4 +
        next.concurrentSandboxes * 0.3
    )
  }

  return { metrics, step }
}

export const MOCK_METRICS_DATA = (sandboxes: Sandbox[]) =>
  generateMockMetrics(sandboxes)
export const MOCK_SANDBOXES_DATA = () => generateMockSandboxes(120)
export const MOCK_TEMPLATES_DATA = TEMPLATES
export const MOCK_DEFAULT_TEMPLATES_DATA = DEFAULT_TEMPLATES
export const MOCK_TEAM_METRICS_DATA = generateMockTeamMetrics

/**
 * Generate mock max team metrics data for a given date range and metric
 */
export const MOCK_TEAM_METRICS_MAX_DATA = (
  startDateMs: number,
  endDateMs: number,
  metric: 'concurrent_sandboxes' | 'sandbox_start_rate'
) => {
  const metrics = generateMockTeamMetrics(startDateMs, endDateMs)

  // find the maximum value for the requested metric
  let maxValue = 0
  let maxTimestamp = startDateMs

  for (const m of metrics.metrics) {
    const value =
      metric === 'concurrent_sandboxes'
        ? m.concurrentSandboxes
        : m.sandboxStartRate

    if (value > maxValue) {
      maxValue = value
      maxTimestamp = m.timestamp
    }
  }

  return {
    timestamp: maxTimestamp,
    timestampUnix: maxTimestamp, // already in milliseconds
    value: maxValue,
    metric,
  }
}
