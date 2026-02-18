-- Timestamp: 20260217145145

BEGIN;

CREATE OR REPLACE FUNCTION public.list_team_builds_rpc(
  p_team_id uuid,
  p_statuses text[] DEFAULT ARRAY['waiting', 'building', 'uploaded', 'failed']::text[],
  p_limit integer DEFAULT 50,
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_build_id_or_template text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  status text,
  reason jsonb,
  created_at timestamptz,
  finished_at timestamptz,
  template_id text,
  template_alias text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
WITH params AS (
  SELECT
    p_team_id AS team_id,
    CASE
      WHEN p_statuses IS NULL OR CARDINALITY(p_statuses) = 0
        THEN ARRAY['waiting', 'building', 'uploaded', 'failed']::text[]
      ELSE p_statuses
    END AS statuses,
    GREATEST(1, LEAST(COALESCE(p_limit, 50), 100)) AS requested_limit,
    COALESCE(p_cursor_created_at, 'infinity'::timestamptz) AS cursor_created_at,
    CASE
      WHEN p_cursor_created_at IS NULL
        THEN 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid
      WHEN p_cursor_id IS NULL
        THEN '00000000-0000-0000-0000-000000000000'::uuid
      ELSE p_cursor_id
    END AS cursor_id,
    NULLIF(BTRIM(p_build_id_or_template), '') AS search_term
),
resolved AS (
  SELECT
    p.*,
    CASE
      WHEN p.search_term ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN p.search_term::uuid
      ELSE NULL
    END AS candidate_build_id,
    COALESCE(
      (
        SELECT e.id
        FROM public.envs e
        WHERE e.team_id = p.team_id
          AND e.id = p.search_term
        LIMIT 1
      ),
      (
        SELECT ea.env_id
        FROM public.env_aliases ea
        JOIN public.envs e
          ON e.id = ea.env_id
        WHERE e.team_id = p.team_id
          AND ea.alias = p.search_term
        ORDER BY ea.id ASC
        LIMIT 1
      )
    ) AS resolved_template_id
  FROM params p
),
page_data AS (
  SELECT
    b.id,
    b.status,
    b.reason::jsonb AS reason,
    b.created_at,
    b.finished_at,
    b.env_id AS template_id
  FROM public.env_builds b
  JOIN resolved r
    ON r.team_id = b.team_id
  WHERE b.status = ANY (r.statuses)
    AND (b.created_at, b.id) < (r.cursor_created_at, r.cursor_id)
    AND (
      r.search_term IS NULL
      OR (r.candidate_build_id IS NOT NULL AND b.id = r.candidate_build_id)
      OR (r.resolved_template_id IS NOT NULL AND b.env_id = r.resolved_template_id)
    )
  ORDER BY b.created_at DESC, b.id DESC
  LIMIT (SELECT requested_limit + 1 FROM params)
)
SELECT
  d.id,
  d.status,
  d.reason,
  d.created_at,
  d.finished_at,
  d.template_id,
  ea.alias AS template_alias
FROM page_data d
LEFT JOIN LATERAL (
  SELECT x.alias
  FROM public.env_aliases x
  WHERE x.env_id = d.template_id
  ORDER BY x.id ASC
  LIMIT 1
) ea ON TRUE
ORDER BY d.created_at DESC, d.id DESC;
$function$;

REVOKE ALL ON FUNCTION public.list_team_builds_rpc(uuid, text[], integer, timestamptz, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_team_builds_rpc(uuid, text[], integer, timestamptz, uuid, text) TO service_role;

COMMIT;
