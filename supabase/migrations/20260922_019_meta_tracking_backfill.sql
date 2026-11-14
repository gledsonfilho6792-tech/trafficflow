-- =========================================================
-- TRAFFIC FLOW
-- Migration 019
-- Backfill de atribuição Meta nas tracking_sessions
-- =========================================================


create or replace function
  public.backfill_tracking_meta_attribution(
    p_project_id uuid
  )
returns table (
  updated_ads bigint,
  updated_ad_sets bigint,
  updated_campaigns bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_ads bigint := 0;
  v_updated_ad_sets bigint := 0;
  v_updated_campaigns bigint := 0;
begin

  -- =======================================================
  -- 1. ANÚNCIOS
  --
  -- O anúncio é a melhor resolução porque
  -- já contém ad_set_id e campaign_id.
  -- =======================================================

  update public.tracking_sessions ts
  set
    ad_id = a.id,
    ad_set_id = a.ad_set_id,
    campaign_id = a.campaign_id
  from public.ads a
  where
    ts.project_id = p_project_id
    and a.project_id = p_project_id
    and ts.meta_ad_external_id is not null
    and ts.meta_ad_external_id = a.external_id
    and (
      ts.ad_id is distinct from a.id
      or ts.ad_set_id is distinct from a.ad_set_id
      or ts.campaign_id is distinct from a.campaign_id
    );

  get diagnostics
    v_updated_ads = row_count;


  -- =======================================================
  -- 2. CONJUNTOS
  --
  -- Utilizado quando o anúncio ainda não foi encontrado,
  -- mas o conjunto já existe.
  -- =======================================================

  update public.tracking_sessions ts
  set
    ad_set_id = aset.id,

    campaign_id =
      coalesce(
        ts.campaign_id,
        aset.campaign_id
      )
  from public.ad_sets aset
  where
    ts.project_id = p_project_id
    and aset.project_id = p_project_id
    and ts.meta_ad_set_external_id is not null
    and ts.meta_ad_set_external_id = aset.external_id
    and ts.ad_set_id is null;

  get diagnostics
    v_updated_ad_sets = row_count;


  -- =======================================================
  -- 3. CAMPANHAS
  --
  -- Último fallback.
  -- =======================================================

  update public.tracking_sessions ts
  set
    campaign_id = c.id
  from public.campaigns c
  where
    ts.project_id = p_project_id
    and c.project_id = p_project_id
    and ts.meta_campaign_external_id is not null
    and ts.meta_campaign_external_id = c.external_id
    and ts.campaign_id is null;

  get diagnostics
    v_updated_campaigns = row_count;


  -- =======================================================
  -- RESULTADO
  -- =======================================================

  return query
  select
    v_updated_ads,
    v_updated_ad_sets,
    v_updated_campaigns;

end;
$$;


-- =========================================================
-- SEGURANÇA
-- =========================================================
--
-- Essa função será usada pelo backend do Traffic Flow.
-- Usuários/browser não precisam executá-la diretamente.
-- =========================================================

revoke all
on function
  public.backfill_tracking_meta_attribution(uuid)
from PUBLIC;


revoke all
on function
  public.backfill_tracking_meta_attribution(uuid)
from anon;


revoke all
on function
  public.backfill_tracking_meta_attribution(uuid)
from authenticated;


grant execute
on function
  public.backfill_tracking_meta_attribution(uuid)
to service_role;