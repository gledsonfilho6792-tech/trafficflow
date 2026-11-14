alter table public.orders
  add column if not exists tracking_session_id uuid
    references public.tracking_sessions(id)
    on delete set null,

  add column if not exists tracking_source_id uuid
    references public.tracking_sources(id)
    on delete set null,

  add column if not exists attribution_token text,

  add column if not exists attribution_method text,

  add column if not exists attributed_at timestamptz;


create index if not exists
  orders_tracking_session_id_idx
on public.orders(
  tracking_session_id
);


create index if not exists
  orders_tracking_source_id_idx
on public.orders(
  tracking_source_id
);


create index if not exists
  orders_attribution_token_idx
on public.orders(
  attribution_token
);


create index if not exists
  orders_attribution_method_idx
on public.orders(
  attribution_method
);


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'orders_attribution_method_check'
  ) then

    alter table public.orders
      add constraint
        orders_attribution_method_check
      check (
        attribution_method is null
        or attribution_method in (
          'session_id',
          'token',
          'visitor_id',
          'fbclid',
          'utm'
        )
      );

  end if;
end
$$;