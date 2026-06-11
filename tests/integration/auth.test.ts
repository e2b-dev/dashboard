import { redirect } from 'next/navigation'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import {
  forgotPasswordAction,
  signInAction,
  signInWithOAuthAction,
  signUpAction,
} from '@/core/server/actions/auth-actions'
import { authRouter } from '@/core/server/api/routers/auth'
import { createCallerFactory, createTRPCContext } from '@/core/server/trpc/init'
import { encodedRedirect } from '@/lib/utils/auth'

// Create hoisted mock functions that can be used throughout the file
const { validateEmail, shouldWarnAboutAlternateEmail } = vi.hoisted(() => ({
  validateEmail: vi.fn(),
  shouldWarnAboutAlternateEmail: vi.fn(),
}))

const { verifyTurnstileToken } = vi.hoisted(() => ({
  verifyTurnstileToken: vi.fn(),
}))

// Mock console.error to prevent output during tests
const originalConsoleError = console.error
console.error = vi.fn()

// Mock global fetch for health check
const originalFetch = global.fetch
const fetchMock = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ version: 'v2.60.7', name: 'GoTrue' }),
})

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
  },
}

// Mock dependencies
vi.mock('@/core/shared/clients/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

vi.mock('@/core/shared/clients/supabase/admin', () => ({
  supabaseAdmin: {
    auth: vi.fn(),
  },
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn((key) => {
      if (key === 'origin') return 'https://app.e2b.dev'
      return null
    }),
  })),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url) => ({ destination: url })),
}))

vi.mock('@/lib/utils/auth', () => ({
  encodedRedirect: vi.fn((type, url, message, params) => {
    const queryString = new URLSearchParams({
      [type]: message,
      ...(params ?? {}),
    })

    return {
      type,
      destination: `${url}?${queryString.toString()}`,
      message,
      params,
    }
  }),
}))

// Use the hoisted mock functions in the module mock
vi.mock('@/core/server/functions/auth/validate-email', () => ({
  validateEmail,
  shouldWarnAboutAlternateEmail,
}))

vi.mock('@/lib/captcha/turnstile', () => ({
  verifyTurnstileToken,
}))

describe('Auth Actions - Integration Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Set up fetch mock for health check
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ version: 'v2.60.7', name: 'GoTrue' }),
    })
    global.fetch = fetchMock as unknown as typeof fetch
    verifyTurnstileToken.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    // Restore original console.error after each test
    console.error = originalConsoleError
    global.fetch = originalFetch
  })

  describe('Sign In Flow', () => {
    /**
     * AUTHENTICATION TEST: Verifies that sign-in with valid credentials works
     * and redirects to the dashboard or returnTo URL
     */
    it('should redirect to dashboard on successful login', async () => {
      // Setup: Mock Supabase client to return successful auth
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      // Setup: Create form data with valid credentials
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'password123')

      // Execute: Call the sign-in action
      await signInAction({
        email: 'test@example.com',
        password: 'password123',
      })

      // Verify: Check that redirect was called with dashboard URL
      expect(redirect).toHaveBeenCalledWith(PROTECTED_URLS.DASHBOARD)
    })

    it('should redirect to returnTo URL if provided', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      await signInAction({
        email: 'test@example.com',
        password: 'password123',
        returnTo: '/dashboard/team-123/sandboxes',
      })

      expect(redirect).toHaveBeenCalledWith('/dashboard/team-123/sandboxes')
    })

    it('should block password sign-in while auth migration is in progress', async () => {
      vi.stubEnv('NEXT_PUBLIC_AUTH_MIGRATION_IN_PROGRESS', '1')

      const result = await signInAction({
        email: 'test@example.com',
        password: 'password123',
        returnTo: '/dashboard/team-123',
      })

      expect(result?.serverError).toBe(
        'Sign-ins are temporarily paused while we migrate our authentication system. Please try again later.'
      )
      expect(fetchMock).not.toHaveBeenCalled()
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled()
    })

    it('should throw validation error if returnTo is not a relative path', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const result = await signInAction({
        email: 'test@example.com',
        password: 'password123',
        returnTo: 'https://app.e2b.dev/dashboard/team-123/sandboxes',
      })

      expect(result?.validationErrors?.fieldErrors.returnTo).toBeDefined()
    })

    it('should throw validation error if returnTo is a malicious URL', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const result = await signInAction({
        email: 'test@example.com',
        password: 'password123',
        returnTo: 'javascript:alert(document.cookie)',
      })

      expect(result?.validationErrors?.fieldErrors.returnTo).toBeDefined()
    })

    /**
     * ERROR HANDLING TEST: Verifies that sign-in with invalid credentials
     * shows appropriate error message
     */
    it('should show error message on invalid credentials', async () => {
      // Setup: Mock Supabase client to return auth error
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' },
      })

      // Execute: Call the sign-in action
      const result = await signInAction({
        email: 'test@example.com',
        password: 'password123',
      })

      // Verify: Check that encodedRedirect was called with error message
      expect(result).toBeDefined()
      expect(result).toHaveProperty('serverError')
    })
  })

  describe('Sign Up Flow', () => {
    /**
     * AUTHENTICATION TEST: Verifies that sign-up with valid data
     * shows success message
     */
    it('should show success message on valid sign-up', async () => {
      // Set up mock implementations for this specific test
      validateEmail.mockResolvedValue({
        valid: true,
        data: { status: 'valid', address: 'newuser@example.com' },
      })

      shouldWarnAboutAlternateEmail.mockResolvedValue(false)

      // Setup: Mock Supabase client to return successful sign-up
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: 'new-user-123' } },
        error: null,
      })

      // Setup: Create form data with valid sign-up data
      const formData = new FormData()
      formData.append('email', 'newuser@example.com')
      formData.append('password', 'Password123!')
      formData.append('confirmPassword', 'Password123!')

      // Execute: Call the sign-up action
      const result = await signUpAction({
        email: 'newuser@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        captchaToken: 'test-captcha-token',
      })

      // Verify: Check that encodedRedirect was called with success message
      expect(result).toBeDefined()
      expect(result).not.toHaveProperty('serverError')
      expect(result).not.toHaveProperty('validationErrors')
    })

    /**
     * VALIDATION TEST: Verifies that sign-up with mismatched passwords
     * shows appropriate error message
     */
    it('should show error when passwords do not match', async () => {
      // Execute: Call the sign-up action
      const result = await signUpAction({
        email: 'newuser@example.com',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword!',
        captchaToken: 'test-captcha-token',
      })

      // Verify: Check that encodedRedirect was called with error message
      expect(result).toBeDefined()
      expect(result).toHaveProperty('validationErrors')
    })

    /**
     * VALIDATION TEST: Verifies that sign-up with missing required fields
     * shows appropriate error message
     */
    it('should show error when required fields are missing', async () => {
      // Setup: Create form data with missing fields
      // Missing password and confirmPassword

      // Execute: Call the sign-up action
      const result = await signUpAction({
        email: 'newuser@example.com',
      } as never)

      // Verify: Check that the result contains validation errors
      expect(result).toBeDefined()
      expect(result).toHaveProperty('validationErrors')
    })

    /**
     * ERROR HANDLING TEST: Verifies that sign-up with existing email
     * shows appropriate error message
     */
    it('should show error when email already exists', async () => {
      // Setup: Mock console.error to prevent output
      console.error = vi.fn()

      // Setup: Mock Supabase client to return error for existing email
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: null,
        error: {
          message: 'User already registered',
          code: 'auth/user-already-exists',
        },
      })

      // Setup: Create form data with existing email
      const formData = new FormData()
      formData.append('email', 'existing@example.com')
      formData.append('password', 'Password123!')
      formData.append('confirmPassword', 'Password123!')

      // Execute: Call the sign-up action
      const result = await signUpAction({
        email: 'newuser@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        captchaToken: 'test-captcha-token',
      })

      // Verify: Check that encodedRedirect was called with error message
      expect(result).toBeDefined()
      expect(result).toHaveProperty('serverError')
    })
  })

  describe('Password Reset Flow', () => {
    /**
     * AUTHENTICATION TEST: Verifies that forgot password with valid email
     * shows success message
     */
    it('should show success message on valid forgot password request', async () => {
      // Setup: Mock Supabase client to return successful password reset
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      })

      // Setup: Create form data with valid email
      const formData = new FormData()
      formData.append('email', 'user@example.com')

      // Execute: Call the forgot password action
      const result = await forgotPasswordAction({
        email: 'user@example.com',
      })

      // Verify: Check that encodedRedirect was called with success message
      expect(result).toBeDefined()
      expect(result).not.toHaveProperty('serverError')
      expect(result).not.toHaveProperty('validationErrors')
    })

    it('should block forgot password while auth migration is in progress', async () => {
      vi.stubEnv('NEXT_PUBLIC_AUTH_MIGRATION_IN_PROGRESS', '1')

      const result = await forgotPasswordAction({
        email: 'user@example.com',
      })

      expect(result?.serverError).toBe(
        'Sign-ins are temporarily paused while we migrate our authentication system. Please try again later.'
      )
      expect(fetchMock).not.toHaveBeenCalled()
      expect(
        mockSupabaseClient.auth.resetPasswordForEmail
      ).not.toHaveBeenCalled()
    })

    /**
     * VALIDATION TEST: Verifies that forgot password with missing email
     * shows appropriate error message
     */
    it('should show error when email is missing for forgot password', async () => {
      // Execute: Call the forgot password action
      const result = await forgotPasswordAction({
        email: '',
      })

      expect(result).toBeDefined()
      expect(result).toHaveProperty('validationErrors')
    })

    // TODO: find a way to fix authActionClient actions
    /**
     * AUTHENTICATION TEST: Verifies that reset password with valid data
     * shows success message
     */
    /*     it('should show success message on valid password reset', async () => {
      // Setup: Mock Supabase client to return successful password update
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      // Mock the context with supabase client that would be provided by authActionClient
      const mockCtx = {
        supabase: mockSupabaseClient,
        user: { id: 'user-123' },
      }

      // Execute: Call the updateUser action with mocked context
      const result = await updateUserAction.implementation({
        parsedInput: { password: 'NewPassword123!' },
        ctx: mockCtx,
      })

      // Verify: Check that the action returned the expected result
      expect(result).toBeDefined()
      expect(result).toHaveProperty('user')
    }) */
  })

  describe('OAuth Authentication', () => {
    /**
     * AUTHENTICATION TEST: Verifies that OAuth sign-in redirects to provider
     */
    it('should redirect to OAuth provider', async () => {
      // Setup: Mock Supabase client to return OAuth URL
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
        data: { url: 'https://oauth-provider.com/auth' },
        error: null,
      })

      // Execute: Call the OAuth sign-in action
      await signInWithOAuthAction({ provider: 'github' })

      // Verify: Check that redirect was called with OAuth URL
      expect(redirect).toHaveBeenCalledWith('https://oauth-provider.com/auth')
    })

    /**
     * ERROR HANDLING TEST: Verifies that OAuth sign-in with error
     * shows appropriate error message
     */
    it('should show error when OAuth provider fails', async () => {
      // Setup: Mock Supabase client to return OAuth error
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
        data: {},
        error: { message: 'OAuth provider unavailable' },
      })

      // Execute: Call the OAuth sign-in action
      await signInWithOAuthAction({ provider: 'github' })

      // Verify: Check that encodedRedirect was called with error message
      expect(encodedRedirect).toHaveBeenCalledWith(
        'error',
        AUTH_URLS.SIGN_IN,
        'OAuth provider unavailable',
        undefined
      )
    })

    /**
     * AUTHENTICATION TEST: Verifies that OAuth sign-in with returnTo
     * includes returnTo in redirect URL
     */
    it('should include returnTo in OAuth redirect URL', async () => {
      // Setup: Mock Supabase client to return OAuth URL
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
        data: { url: 'https://oauth-provider.com/auth' },
        error: null,
      })

      // Execute: Call the OAuth sign-in action with returnTo
      await signInWithOAuthAction({
        provider: 'github',
        returnTo: '/dashboard/team-123',
      })

      // Verify: Check that signInWithOAuth was called with correct options
      expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'github',
        options: {
          redirectTo: expect.stringContaining(
            'returnTo=%2Fdashboard%2Fteam-123'
          ),
          scopes: 'email',
        },
      })
    })

    it('should block OAuth sign-in while auth migration is in progress', async () => {
      vi.stubEnv('NEXT_PUBLIC_AUTH_MIGRATION_IN_PROGRESS', '1')

      await signInWithOAuthAction({
        provider: 'google',
        returnTo: '/dashboard/team-123',
      })

      expect(encodedRedirect).toHaveBeenCalledWith(
        'error',
        AUTH_URLS.SIGN_IN,
        'Sign-ins are temporarily paused while we migrate our authentication system. Please try again later.',
        { returnTo: '/dashboard/team-123' }
      )
      expect(fetchMock).not.toHaveBeenCalled()
      expect(mockSupabaseClient.auth.signInWithOAuth).not.toHaveBeenCalled()
    })
  })

  describe('Sign Out Flow (trpc auth.signOut)', () => {
    const createCaller = createCallerFactory(authRouter)

    const getCaller = async () =>
      createCaller(await createTRPCContext({ headers: new Headers() }))

    /**
     * AUTHENTICATION TEST: Verifies that sign-out returns the sign-in page url
     */
    it('should return sign-in page url on sign-out', async () => {
      // Setup: Mock Supabase client to return successful sign-out
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      })

      // Execute and Verify: the mutation returns the URL for the client to hard-navigate to
      const caller = await getCaller()
      await expect(caller.signOut()).resolves.toEqual({
        url: AUTH_URLS.SIGN_IN,
      })
    })

    /**
     * AUTHENTICATION TEST: Verifies that sign-out returns the sign-in url with returnTo
     */
    it('should return sign-in page url with returnTo parameter', async () => {
      // Setup: Mock Supabase client to return successful sign-out
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      })

      // Execute and Verify: the mutation returns the URL for the client to hard-navigate to
      const caller = await getCaller()
      await expect(caller.signOut({ returnTo: '/dashboard' })).resolves.toEqual(
        {
          url: `${AUTH_URLS.SIGN_IN}?returnTo=${encodeURIComponent('/dashboard')}`,
        }
      )
    })
  })
})
