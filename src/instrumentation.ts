import { registerOTel } from '@vercel/otel'

export async function register() {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation.node')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const {
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

    registerOTel({
      serviceName: process.env.OTEL_SERVICE_NAME || 'e2b-dashboard',
      attributes: {
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
        ...(VERCEL_GIT_PROVIDER && {
          'vercel.git.provider': VERCEL_GIT_PROVIDER,
        }),
      },
    })
  }
}
