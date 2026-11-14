-- =========================================================
-- TRAFFIC FLOW
-- Migration 006
-- Leitura server-side de credenciais
-- =========================================================

create or replace function public.get_integration_secret(
  p_integration_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
  v_secret text;
begin

  select credentials_secret_id
  into v_secret_id
  from public.integrations
  where id = p_integration_id;

  if v_secret_id is null then
    return null;
  end if;

  select decrypted_secret
  into v_secret
  from vault.decrypted_secrets
  where id = v_secret_id;

  return v_secret;

end;
$$;


revoke all
on function public.get_integration_secret(uuid)
from public;

grant execute
on function public.get_integration_secret(uuid)
to service_role;