import { trace } from '@opentelemetry/api';

export function tracer() {
  const tracer = trace.getTracer(process.env.OTEL_SERVICE_NAME || 'e2b-dashboard')

  return tracer
}

