// Sandbox TTL (and connect-request wait) granted on an explicit inspect resume.
// Kept short on purpose: resuming for inspect should give a brief debug window,
// not silently extend a customer sandbox's lifetime.
export const SANDBOX_RESUME_TIMEOUT_MS = 70_000
