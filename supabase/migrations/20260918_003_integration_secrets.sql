-- =========================================================
-- TRAFFIC FLOW
-- Migration 003
-- Armazenamento seguro de credenciais no Supabase Vault
-- =========================================================

create or replace function public.store_integration_secret(
  p_integration_id uuid,
  p_secret text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
  v_owner_id uuid;
begin
  if p_secret is null or length(trim(p_secret)) = 0 then
    raise exception 'Secret não pode ser vazio';
  end if;

  select
    i.credentials_secret_id,
    p.owner_id
  into
    v_secret_id,
    v_owner_id
  from public.integrations i
  join public.projects p
    on p.id = i.project_id
  where i.id = p_integration_id;

  if v_owner_id is null then
    raise exception 'Integração não encontrada';
  end if;

  if v_owner_id <> auth.uid() then
    raise exception 'Acesso negado';
  end if;

  if v_secret_id is null then

    select vault.create_secret(
      p_secret,
      'traffic_flow_integration_' || p_integration_id::text,
      'Credential stored by Traffic Flow'
    )
    into v_secret_id;

    update public.integrations
    set credentials_secret_id = v_secret_id
    where id = p_integration_id;

  else

    perform vault.update_secret(
      v_secret_id,
      p_secret
    );

  end if;

  return v_secret_id;
end;
$$;


revoke all
on function public.store_integration_secret(uuid, text)
from public;


grant execute
on function public.store_integration_secret(uuid, text)
to authenticated;