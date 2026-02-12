-- Timestamp: 20260212120822

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
    p_cursor_created_at AS cursor_created_at,
    p_cursor_id AS cursor_id,
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
    (
      SELECT e.id
      FROM public.envs e
      WHERE e.team_id = p.team_id
        AND e.id = p.search_term
      LIMIT 1
    ) AS resolved_template_id_by_id
  FROM params p
),
resolved_with_alias AS (
  SELECT
    r.*,
    COALESCE(
      r.resolved_template_id_by_id,
      (
        SELECT ea.env_id
        FROM public.env_aliases ea
        JOIN public.envs e ON e.id = ea.env_id
        WHERE e.team_id = r.team_id
          AND ea.alias = r.search_term
        ORDER BY ea.id ASC
        LIMIT 1
      )
    ) AS resolved_template_id
  FROM resolved r
),
page_ids AS (
  SELECT DISTINCT ON (b.created_at, b.id)
    b.id,
    b.created_at,
    a.env_id
  FROM resolved_with_alias f
  JOIN public.envs e
    ON e.team_id = f.team_id
  JOIN public.env_build_assignments a
    ON a.env_id = e.id
  JOIN public.env_builds b
    ON b.id = a.build_id
  WHERE b.status = ANY (f.statuses)
    AND (
      f.cursor_created_at IS NULL
      OR (f.cursor_id IS NULL AND b.created_at < f.cursor_created_at)
      OR (
        f.cursor_id IS NOT NULL
        AND (b.created_at, b.id) < (f.cursor_created_at, f.cursor_id)
      )
    )
    AND (
      f.search_term IS NULL
      OR (
        f.resolved_template_id IS NOT NULL
        AND f.candidate_build_id IS NOT NULL
        AND (a.env_id = f.resolved_template_id OR b.id = f.candidate_build_id)
      )
      OR (
        f.resolved_template_id IS NOT NULL
        AND f.candidate_build_id IS NULL
        AND a.env_id = f.resolved_template_id
      )
      OR (
        f.resolved_template_id IS NULL
        AND f.candidate_build_id IS NOT NULL
        AND b.id = f.candidate_build_id
      )
    )
  ORDER BY
    b.created_at DESC,
    b.id DESC,
    a.created_at DESC NULLS LAST,
    a.id DESC
  LIMIT (SELECT requested_limit + 1 FROM params)
),
page_data AS (
  SELECT
    p.id,
    b.status,
    b.reason::jsonb AS reason,
    p.created_at,
    b.finished_at,
    p.env_id AS template_id
  FROM page_ids p
  JOIN public.env_builds b
    ON b.id = p.id
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
