import { trace } from '@opentelemetry/api'

export const getTracer = () => trace.getTracer('dashboard')
