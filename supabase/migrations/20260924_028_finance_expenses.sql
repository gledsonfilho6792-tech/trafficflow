-- =========================================================
-- TRAFFIC FLOW
-- Migration 028
-- Finance Expenses / Known Costs
-- =========================================================


-- =========================================================
-- DESPESAS / CUSTOS
-- =========================================================

create table if not exists public.finance_expenses (
  id uuid
    primary key
    default gen_random_uuid(),

  project_id uuid
    not null
    references public.projects(id)
    on delete cascade,


  -- =======================================================
  -- CLASSIFICAÇÃO
  -- =======================================================

  category text
    not null
    check (
      category in (
        'checkout_fee',
        'tax',
        'tool',
        'operational',
        'chargeback_fee',
        'refund_fee',
        'other'
      )
    ),


  name text
    not null,


  description text,


  -- =======================================================
  -- VALOR
  -- =======================================================

  amount_brl numeric(18,6)
    not null
    check (
      amount_brl >= 0
    ),


  occurred_on date
    not null,


  -- =======================================================
  -- ORIGEM DO CUSTO
  -- =======================================================
  --
  -- manual:
  --   lançado pelo usuário
  --
  -- provider:
  --   recebido futuramente de um checkout
  --
  -- system:
  --   gerado automaticamente pelo Traffic Flow
  -- =======================================================

  source text
    not null
    default 'manual'
    check (
      source in (
        'manual',
        'provider',
        'system'
      )
    ),


  provider text,


  external_ref text,


  metadata jsonb
    not null
    default '{}'::jsonb,


  created_at timestamptz
    not null
    default now(),


  updated_at timestamptz
    not null
    default now()
);


-- =========================================================
-- ÍNDICES
-- =========================================================

create index if not exists
  idx_finance_expenses_project_date
on public.finance_expenses (
  project_id,
  occurred_on desc
);


create index if not exists
  idx_finance_expenses_project_category
on public.finance_expenses (
  project_id,
  category,
  occurred_on desc
);


-- =========================================================
-- IDEMPOTÊNCIA PARA CUSTOS AUTOMÁTICOS
-- =========================================================
--
-- No futuro, se um checkout enviar uma taxa
-- várias vezes pelo webhook, não queremos
-- duplicar o mesmo custo.
-- =========================================================

create unique index if not exists
  idx_finance_expenses_external_unique
on public.finance_expenses (
  project_id,
  source,
  coalesce(
    provider,
    ''
  ),
  external_ref
)
where
  external_ref is not null;


-- =========================================================
-- UPDATED_AT
-- =========================================================

drop trigger if exists
  finance_expenses_set_updated_at
on public.finance_expenses;


create trigger
  finance_expenses_set_updated_at
before update
on public.finance_expenses
for each row
execute function public.set_updated_at();


-- =========================================================
-- RLS
-- =========================================================

alter table public.finance_expenses
enable row level security;


-- =========================================================
-- SELECT
-- =========================================================

drop policy if exists
  "Users can view own finance expenses"
on public.finance_expenses;


create policy
  "Users can view own finance expenses"
on public.finance_expenses
for select
to authenticated
using (
  exists (
    select 1

    from public.projects

    where
      projects.id =
        finance_expenses.project_id

      and projects.owner_id =
        auth.uid()
  )
);


-- =========================================================
-- INSERT
-- =========================================================

drop policy if exists
  "Users can insert own finance expenses"
on public.finance_expenses;


create policy
  "Users can insert own finance expenses"
on public.finance_expenses
for insert
to authenticated
with check (
  exists (
    select 1

    from public.projects

    where
      projects.id =
        finance_expenses.project_id

      and projects.owner_id =
        auth.uid()
  )
);


-- =========================================================
-- UPDATE
-- =========================================================

drop policy if exists
  "Users can update own finance expenses"
on public.finance_expenses;


create policy
  "Users can update own finance expenses"
on public.finance_expenses
for update
to authenticated
using (
  exists (
    select 1

    from public.projects

    where
      projects.id =
        finance_expenses.project_id

      and projects.owner_id =
        auth.uid()
  )
)
with check (
  exists (
    select 1

    from public.projects

    where
      projects.id =
        finance_expenses.project_id

      and projects.owner_id =
        auth.uid()
  )
);


-- =========================================================
-- DELETE
-- =========================================================

drop policy if exists
  "Users can delete own finance expenses"
on public.finance_expenses;


create policy
  "Users can delete own finance expenses"
on public.finance_expenses
for delete
to authenticated
using (
  exists (
    select 1

    from public.projects

    where
      projects.id =
        finance_expenses.project_id

      and projects.owner_id =
        auth.uid()
  )
);


-- =========================================================
-- RESUMO DE CUSTOS
-- =========================================================

drop function if exists
  public.get_finance_cost_summary(
    uuid,
    date,
    date
  );


create function public.get_finance_cost_summary(
  p_project_id uuid,

  p_start_date date,

  p_end_date date
)
returns table (
  total_costs numeric,

  checkout_fees numeric,

  taxes numeric,

  tools numeric,

  operational numeric,

  chargeback_fees numeric,

  refund_fees numeric,

  other_costs numeric,

  expense_count bigint
)
language sql
stable
security definer
set search_path = public
as $$

  select

    -- =====================================================
    -- TOTAL
    -- =====================================================

    coalesce(
      sum(
        fe.amount_brl
      ),
      0
    )::numeric
      as total_costs,


    -- =====================================================
    -- TAXAS DE CHECKOUT
    -- =====================================================

    coalesce(
      sum(
        fe.amount_brl
      ) filter (
        where
          fe.category =
            'checkout_fee'
      ),
      0
    )::numeric
      as checkout_fees,


    -- =====================================================
    -- IMPOSTOS
    -- =====================================================

    coalesce(
      sum(
        fe.amount_brl
      ) filter (
        where
          fe.category =
            'tax'
      ),
      0
    )::numeric
      as taxes,


    -- =====================================================
    -- FERRAMENTAS
    -- =====================================================

    coalesce(
      sum(
        fe.amount_brl
      ) filter (
        where
          fe.category =
            'tool'
      ),
      0
    )::numeric
      as tools,


    -- =====================================================
    -- OPERACIONAL
    -- =====================================================

    coalesce(
      sum(
        fe.amount_brl
      ) filter (
        where
          fe.category =
            'operational'
      ),
      0
    )::numeric
      as operational,


    -- =====================================================
    -- CHARGEBACK
    -- =====================================================

    coalesce(
      sum(
        fe.amount_brl
      ) filter (
        where
          fe.category =
            'chargeback_fee'
      ),
      0
    )::numeric
      as chargeback_fees,


    -- =====================================================
    -- REEMBOLSO
    -- =====================================================

    coalesce(
      sum(
        fe.amount_brl
      ) filter (
        where
          fe.category =
            'refund_fee'
      ),
      0
    )::numeric
      as refund_fees,


    -- =====================================================
    -- OUTROS
    -- =====================================================

    coalesce(
      sum(
        fe.amount_brl
      ) filter (
        where
          fe.category =
            'other'
      ),
      0
    )::numeric
      as other_costs,


    count(*)::bigint
      as expense_count


  from public.finance_expenses fe


  where
    fe.project_id =
      p_project_id

    and fe.occurred_on >=
      p_start_date

    and fe.occurred_on <=
      p_end_date;
$$;


-- =========================================================
-- PERMISSÕES DA FUNÇÃO
-- =========================================================

revoke all
on function public.get_finance_cost_summary(
  uuid,
  date,
  date
)
from public;


revoke all
on function public.get_finance_cost_summary(
  uuid,
  date,
  date
)
from anon;


revoke all
on function public.get_finance_cost_summary(
  uuid,
  date,
  date
)
from authenticated;


grant execute
on function public.get_finance_cost_summary(
  uuid,
  date,
  date
)
to service_role;