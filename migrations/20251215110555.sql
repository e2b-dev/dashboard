-- Timestamp: 20251215110555
-- Creates a view with normalized Gmail addresses to prevent alias abuse

-- Create the view
CREATE OR REPLACE VIEW public.normalized_gmail_emails AS
SELECT 
  id,
  email,
  LOWER(
    REPLACE(
      SPLIT_PART(SPLIT_PART(email, '@', 1), '+', 1), 
      '.', 
      ''
    ) || '@gmail.com'
  ) AS normalized_email
FROM auth.users
WHERE email ~* '@(gmail|googlemail)\.com$';

COMMENT ON VIEW public.normalized_gmail_emails IS 
  'Normalized Gmail addresses to detect alias abuse (dots and plus addressing)';

-- Restrict access: only service_role can query this view
REVOKE ALL ON public.normalized_gmail_emails FROM PUBLIC;
REVOKE ALL ON public.normalized_gmail_emails FROM authenticated;
REVOKE ALL ON public.normalized_gmail_emails FROM anon;
GRANT SELECT ON public.normalized_gmail_emails TO service_role;
