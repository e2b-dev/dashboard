# Rate Limiting Documentation

This system implements two separate rate limiters for the sign-up flow to prevent different types of abuse.

## Important: Development Environment Support

The rate limiting system now works seamlessly in development environments without proxy headers. When IP headers are missing, the system falls back to a development identifier that still allows rate limiting to function properly.

## 1. Sign-Up Attempts Rate Limiter

**Purpose**: Prevents spam/abuse of the sign-up endpoint by limiting how many times someone can attempt to create an account.

**When Applied**: During the initial sign-up request (before email confirmation)

**Configuration**:
- `SIGN_UP_ATTEMPTS_LIMIT_PER_WINDOW` - Maximum number of sign-up attempts allowed (default: 10, must be positive)
- `SIGN_UP_ATTEMPTS_WINDOW_HOURS` - Time window in hours for attempt limiting (default: 1, must be positive)

**Example**: With defaults, allows 10 sign-up attempts per hour per IP address.

## 2. Actual Sign-Ups Rate Limiter

**Purpose**: Limits the number of confirmed accounts that can be created to prevent mass account creation.

**When Applied**: During email confirmation (when the user clicks the confirmation link)

**Configuration**:
- `SIGN_UP_LIMIT_PER_WINDOW` - Maximum number of confirmed sign-ups allowed (default: 1, must be positive)
- `SIGN_UP_WINDOW_HOURS` - Time window in hours for sign-up limiting (default: 24, must be positive)

**Example**: With defaults, allows 1 confirmed account creation per day per IP address.

## Environment Variables

Add these to your `.env` file:

```bash
# Enable rate limiting (required along with KV configuration)
ENABLE_SIGN_UP_RATE_LIMITING=1

# Redis/KV configuration (required for rate limiting)
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token

# Sign-up attempts rate limiting
SIGN_UP_ATTEMPTS_LIMIT_PER_WINDOW=10        # Max attempts per window (must be positive)
SIGN_UP_ATTEMPTS_WINDOW_HOURS=1  # Window size in hours (must be positive)

# Actual sign-ups rate limiting
SIGN_UP_LIMIT_PER_WINDOW=1       # Max confirmed sign-ups per window (must be positive)
SIGN_UP_WINDOW_HOURS=24          # Window size in hours (must be positive)
```

## How It Works

1. **User attempts to sign up** → Check against attempts rate limiter
   - If rate limited: Return "Too many sign-up attempts. Please try again later."
   - If allowed: Proceed with sign-up

2. **User confirms email** → Check against actual sign-ups rate limiter
   - If rate limited: Return "Too many sign-ups for now. Please try again later."
   - If allowed: Complete account creation

## Key Prefixes

The rate limiters use different Redis key prefixes to track separate counters:
- Sign-up attempts: `signup-attempt:{ip}`
- Actual sign-ups: `signup:{ip}`

This ensures the two rate limiters operate independently.

## IP Address Handling

The system properly handles various IP header formats:

1. **x-forwarded-for**: Parsed to extract the first IP from comma-separated list (client IP)
2. **cf-connecting-ip**: Used directly (Cloudflare header)
3. **x-real-ip**: Used directly (generic proxy header)
4. **Development fallback**: Uses 'development-no-ip' when no headers are present

This ensures the rate limiting works in:
- Production environments with proxies/CDNs
- Development environments without proxy headers
- Local testing scenarios

## Benefits

- **Better User Experience**: Users can retry if they make mistakes (e.g., wrong password format)
- **Enhanced Security**: Prevents both spam attempts and mass account creation
- **Flexible Configuration**: Each rate limiter can be tuned independently
- **Clear Separation**: Different Redis keys prevent interference between the two systems
- **Development Support**: Works seamlessly in local development without proxy configuration
- **Proper IP Parsing**: Correctly handles multi-IP headers from proxy chains
