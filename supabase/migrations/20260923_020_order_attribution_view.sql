-- =========================================================
-- TRAFFIC FLOW
-- Migration 020
-- Consolidated Order Attribution View
-- =========================================================


drop view if exists
  public.order_attribution;


create view
  public.order_attribution
with (
  security_invoker = true
)
as

select

  -- =======================================================
  -- ORDER
  -- =======================================================

  o.id
    as order_id,

  o.project_id,

  o.integration_id,

  o.provider,

  o.external_order_id,

  o.external_transaction_id,

  o.transaction_identifier,

  o.status
    as order_status,

  o.currency,

  o.gross_amount,

  o.net_amount,

  o.charge_amount,

  o.commission_amount,

  o.payment_method,

  o.installments,

  o.offer_code,

  o.paid_at,

  o.provider_created_at,

  o.created_at
    as order_created_at,


  -- =======================================================
  -- CUSTOMER
  -- =======================================================

  o.customer_external_id,

  o.customer_name,

  o.customer_email,

  o.customer_country,

  o.customer_state,

  o.customer_city,


  -- =======================================================
  -- ATTRIBUTION STATUS
  -- =======================================================

  case
    when o.tracking_session_id is not null
      then true
    else false
  end
    as is_attributed,


  case
    when o.tracking_session_id is not null
      then 'attributed'
    when o.attribution_token is not null
      then 'token_unresolved'
    else 'unattributed'
  end
    as attribution_status,


  o.attribution_method,

  o.attribution_token,

  o.attributed_at,


  -- =======================================================
  -- TRACKING SESSION
  -- =======================================================

  o.tracking_session_id,

  coalesce(
    ts.tracking_source_id,
    o.tracking_source_id
  )
    as tracking_source_id,

 coalesce(
  ts.session_id::text,
  o.session_id::text
)
  as session_id,

coalesce(
  ts.visitor_id::text,
  o.visitor_id::text
)
  as visitor_id,

  ts.started_at
    as session_started_at,

  ts.last_seen_at
    as session_last_seen_at,

  ts.landing_url,

  ts.referrer,


  -- =======================================================
  -- MARKETING ATTRIBUTION
  --
  -- Preferimos a tracking_session.
  -- Se ela não existir, usamos o fallback
  -- capturado diretamente no pedido.
  -- =======================================================

  coalesce(
    ts.utm_source,
    o.utm_source
  )
    as utm_source,

  coalesce(
    ts.utm_medium,
    o.utm_medium
  )
    as utm_medium,

  coalesce(
    ts.utm_campaign,
    o.utm_campaign
  )
    as utm_campaign,

  coalesce(
    ts.utm_content,
    o.utm_content
  )
    as utm_content,

  coalesce(
    ts.utm_term,
    o.utm_term
  )
    as utm_term,

  coalesce(
    ts.fbclid,
    o.fbclid
  )
    as fbclid,

  ts.fbp,

  ts.fbc,

  ts.gclid,

  ts.ttclid,


  -- =======================================================
  -- META EXTERNAL IDS
  -- =======================================================

  ts.meta_campaign_external_id,

  ts.meta_ad_set_external_id,

  ts.meta_ad_external_id,

  ts.meta_placement,

  ts.meta_site_source,


  -- =======================================================
  -- META INTERNAL IDS
  -- =======================================================

  ts.campaign_id,

  ts.ad_set_id,

  ts.ad_id,


  -- =======================================================
  -- META CAMPAIGN
  -- =======================================================

  c.external_id
    as campaign_external_id,

  c.name
    as campaign_name,

  c.status
    as campaign_status,

  c.effective_status
    as campaign_effective_status,


  -- =======================================================
  -- META AD SET
  -- =======================================================

  aset.external_id
    as ad_set_external_id,

  aset.name
    as ad_set_name,

  aset.status
    as ad_set_status,

  aset.effective_status
    as ad_set_effective_status,


  -- =======================================================
  -- META AD
  -- =======================================================

  a.external_id
    as ad_external_id,

  a.name
    as ad_name,

  a.status
    as ad_status,

  a.effective_status
    as ad_effective_status,

  a.creative_external_id,


  -- =======================================================
  -- AD ACCOUNT
  -- =======================================================

  coalesce(
    a.ad_account_id,
    aset.ad_account_id,
    c.ad_account_id
  )
    as ad_account_id


from public.orders o


left join public.tracking_sessions ts
  on ts.id =
    o.tracking_session_id


left join public.campaigns c
  on c.id =
    ts.campaign_id


left join public.ad_sets aset
  on aset.id =
    ts.ad_set_id


left join public.ads a
  on a.id =
    ts.ad_id;