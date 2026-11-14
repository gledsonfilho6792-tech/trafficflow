-- =========================================================
-- TRAFFIC FLOW
-- Migration 009
-- Aplicar câmbio histórico aos Insights
-- =========================================================

create or replace function public.apply_exchange_rates_to_insights(
  p_project_id uuid,
  p_ad_account_id uuid,
  p_start_date date,
  p_end_date date
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_brl_updated integer := 0;
  v_usd_updated integer := 0;
begin

  if p_start_date > p_end_date then
    raise exception
      'Data inicial não pode ser maior que data final';
  end if;


  -- =======================================================
  -- CONTAS / MÉTRICAS JÁ EM BRL
  -- =======================================================

  update public.ad_insights_daily
  set
    fx_rate_to_brl = 1,
    spend_brl = spend_native,
    updated_at = now()
  where project_id = p_project_id
    and ad_account_id = p_ad_account_id
    and metric_date between p_start_date and p_end_date
    and currency = 'BRL';

  get diagnostics
    v_brl_updated = row_count;


  -- =======================================================
  -- USD -> BRL
  --
  -- Para cada dia de métrica:
  -- usa a cotação daquele dia;
  -- se não existir (fim de semana / feriado),
  -- utiliza a última cotação anterior disponível.
  -- =======================================================

  with insight_rates as (
    select
      insights.id,
      rates.rate
    from public.ad_insights_daily
      as insights

    join lateral (
      select
        exchange_rates.rate
      from public.exchange_rates
        as exchange_rates
      where
        exchange_rates.base_currency = 'USD'
        and exchange_rates.quote_currency = 'BRL'
        and exchange_rates.rate_date <= insights.metric_date
      order by
        exchange_rates.rate_date desc
      limit 1
    ) as rates
      on true

    where
      insights.project_id = p_project_id
      and insights.ad_account_id = p_ad_account_id
      and insights.metric_date
        between p_start_date and p_end_date
      and insights.currency = 'USD'
  )

  update public.ad_insights_daily
    as insights

  set
    fx_rate_to_brl =
      insight_rates.rate,

    spend_brl =
      round(
        insights.spend_native
        * insight_rates.rate,
        6
      ),

    updated_at = now()

  from insight_rates

  where
    insights.id =
      insight_rates.id;

  get diagnostics
    v_usd_updated = row_count;


  return
    v_brl_updated
    + v_usd_updated;

end;
$$;


revoke all
on function public.apply_exchange_rates_to_insights(
  uuid,
  uuid,
  date,
  date
)
from public;


grant execute
on function public.apply_exchange_rates_to_insights(
  uuid,
  uuid,
  date,
  date
)
to service_role;