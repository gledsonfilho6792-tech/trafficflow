-- =========================================================
-- TRAFFIC FLOW
-- Migration 018
-- Meta Ads Attribution em Tracking Sessions
-- =========================================================


alter table public.tracking_sessions

  add column if not exists
    meta_campaign_external_id text,

  add column if not exists
    meta_ad_set_external_id text,

  add column if not exists
    meta_ad_external_id text,

  add column if not exists
    meta_placement text,

  add column if not exists
    meta_site_source text,

  add column if not exists
    campaign_id uuid
      references public.campaigns(id)
      on delete set null,

  add column if not exists
    ad_set_id uuid
      references public.ad_sets(id)
      on delete set null,

  add column if not exists
    ad_id uuid
      references public.ads(id)
      on delete set null;


-- =========================================================
-- ÍNDICES DOS IDs EXTERNOS
-- =========================================================

create index if not exists
  idx_tracking_sessions_meta_campaign_external
on public.tracking_sessions (
  project_id,
  meta_campaign_external_id
)
where meta_campaign_external_id
  is not null;


create index if not exists
  idx_tracking_sessions_meta_ad_set_external
on public.tracking_sessions (
  project_id,
  meta_ad_set_external_id
)
where meta_ad_set_external_id
  is not null;


create index if not exists
  idx_tracking_sessions_meta_ad_external
on public.tracking_sessions (
  project_id,
  meta_ad_external_id
)
where meta_ad_external_id
  is not null;


-- =========================================================
-- ÍNDICES DAS ENTIDADES RESOLVIDAS
-- =========================================================

create index if not exists
  idx_tracking_sessions_campaign_id
on public.tracking_sessions (
  campaign_id
)
where campaign_id
  is not null;


create index if not exists
  idx_tracking_sessions_ad_set_id
on public.tracking_sessions (
  ad_set_id
)
where ad_set_id
  is not null;


create index if not exists
  idx_tracking_sessions_ad_id
on public.tracking_sessions (
  ad_id
)
where ad_id
  is not null;