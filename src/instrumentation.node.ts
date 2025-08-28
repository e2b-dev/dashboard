import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import {
  envDetector,
  hostDetector,
  resourceFromAttributes,
} from '@opentelemetry/resources'
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { NodeSDK } from '@opentelemetry/sdk-node'
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions'
import { FetchInstrumentation } from '@vercel/otel'

function parseResourceAttributes(
  resourceAttrs?: string
): Record<string, string> {
  if (!resourceAttrs) return {}

  return resourceAttrs.split(',').reduce(
    (acc, attr) => {
      const [key, value] = attr.split('=')
      if (key && value) {
        acc[key.trim()] = value.trim()
      }
      return acc
    },
    {} as Record<string, string>
  )
}

const {
  OTEL_SERVICE_NAME,
  OTEL_EXPORTER_OTLP_ENDPOINT,
  OTEL_RESOURCE_ATTRIBUTES,
  VERCEL_ENV,
  VERCEL_URL,
  VERCEL_PROJECT_PRODUCTION_URL,
  VERCEL_BRANCH_URL,
  VERCEL_REGION,
  VERCEL_DEPLOYMENT_ID,
  VERCEL_GIT_COMMIT_SHA,
  VERCEL_GIT_COMMIT_MESSAGE,
  VERCEL_GIT_COMMIT_AUTHOR_NAME,
  VERCEL_GIT_REPO_SLUG,
  VERCEL_GIT_REPO_OWNER,
  VERCEL_GIT_PROVIDER,
} = process.env

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: OTEL_SERVICE_NAME || 'e2b-dashboard',
    [ATTR_SERVICE_VERSION]: process.env.BUILD,
    // Parse additional resource attributes from environment
    ...parseResourceAttributes(OTEL_RESOURCE_ATTRIBUTES),
    // Vercel context
    ...(VERCEL_ENV && { 'vercel.env': VERCEL_ENV }),
    ...(VERCEL_URL && { 'vercel.url': VERCEL_URL }),
    ...(VERCEL_PROJECT_PRODUCTION_URL && {
      'vercel.project_production_url': VERCEL_PROJECT_PRODUCTION_URL,
    }),
    ...(VERCEL_BRANCH_URL && { 'vercel.branch_url': VERCEL_BRANCH_URL }),
    ...(VERCEL_REGION && { 'vercel.region': VERCEL_REGION }),
    ...(VERCEL_DEPLOYMENT_ID && {
      'vercel.deployment_id': VERCEL_DEPLOYMENT_ID,
    }),
    ...(VERCEL_GIT_COMMIT_SHA && {
      'vercel.git.commit_sha': VERCEL_GIT_COMMIT_SHA,
    }),
    ...(VERCEL_GIT_COMMIT_MESSAGE && {
      'vercel.git.commit_message': VERCEL_GIT_COMMIT_MESSAGE,
    }),
    ...(VERCEL_GIT_COMMIT_AUTHOR_NAME && {
      'vercel.git.commit_author': VERCEL_GIT_COMMIT_AUTHOR_NAME,
    }),
    ...(VERCEL_GIT_REPO_SLUG && {
      'vercel.git.repo_slug': VERCEL_GIT_REPO_SLUG,
    }),
    ...(VERCEL_GIT_REPO_OWNER && {
      'vercel.git.repo_owner': VERCEL_GIT_REPO_OWNER,
    }),
    ...(VERCEL_GIT_PROVIDER && { 'vercel.git.provider': VERCEL_GIT_PROVIDER }),
  }),
  traceExporter: new OTLPTraceExporter({
    url: `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics`,
    }),
  }),
  logRecordProcessors: [
    new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/logs`,
      })
    ),
  ],
  instrumentations: [
    getNodeAutoInstrumentations({
      // disable `instrumentation-fs` because it's bloating the traces
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
    }),
    new FetchInstrumentation(),
  ],
  resourceDetectors: [envDetector, hostDetector],
})

sdk.start()

process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error: unknown) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0))
})
