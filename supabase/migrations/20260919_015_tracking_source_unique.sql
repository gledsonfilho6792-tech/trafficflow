-- =========================================================
-- TRAFFIC FLOW
-- Migration 015
-- Fonte principal de tracking sem duplicações
-- =========================================================

create unique index if not exists
  tracking_sources_project_name_unique
on public.tracking_sources (
  project_id,
  name
);
