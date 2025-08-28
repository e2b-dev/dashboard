import { api } from '@opentelemetry/sdk-node'

export const getTracer = () =>
  api.trace.getTracer(process.env.OTEL_SERVICE_NAME || 'e2b-dashboard')
