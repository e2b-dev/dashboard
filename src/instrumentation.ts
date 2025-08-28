import { registerOTel } from '@vercel/otel'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation.node')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    registerOTel({
      serviceName: process.env.OTEL_SERVICE_NAME || 'e2b-dashboard',
    })
  }
}
