-- =========================================================
-- TRAFFIC FLOW
-- Migration 002
-- Evita integrações duplicadas dentro do mesmo projeto
-- =========================================================

create unique index if not exists
  integrations_project_provider_type_unique
on public.integrations (
  project_id,
  provider,
  integration_type
);