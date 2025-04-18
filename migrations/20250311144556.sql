CREATE OR REPLACE VIEW public.auth_users AS
SELECT
    id,
    email
FROM auth.users;

-- Revoke all permissions to ensure no public access
REVOKE ALL ON public.auth_users FROM PUBLIC;
REVOKE ALL ON public.auth_users FROM anon;
REVOKE ALL ON public.auth_users FROM authenticated;