import type { createAdminClient } from '@/lib/supabase/admin'

export async function getTrackingDiagnostics(
  admin: ReturnType<typeof createAdminClient>,
  projectId: string,
  start: string,
  end: string,
  sourceId: string | null
) {
  function count(table: string, date: string) {
    let query = admin.from(table).select('*', { count: 'exact', head: true })
      .eq('project_id', projectId).gte(date, start).lt(date, end)
    if (sourceId) query = query.eq('tracking_source_id', sourceId)
    return query
  }

  const results = await Promise.all([
    count('tracking_sessions', 'started_at'),
    count('tracking_events', 'occurred_at'),
    count('attribution_tokens', 'created_at'),
    count('attribution_tokens', 'created_at').not('last_used_at', 'is', null),
    count('order_attribution', 'order_created_at'),
    count('order_attribution', 'order_created_at').eq('is_attributed', true),
    count('order_attribution', 'order_created_at').eq('is_attributed', false).eq('attribution_status', 'token_unresolved'),
    count('order_attribution', 'order_created_at').eq('is_attributed', false).or('attribution_status.is.null,attribution_status.neq.token_unresolved'),
  ])
  for (const result of results) {
    if (result.error) throw new Error(result.error.message)
  }
  const [sessions, events, tokensCreated, tokensUsed, orders, attributed, tokenPending, unattributed] = results.map(result => result.count ?? 0)
  const alerts: string[] = []
  if (!sessions) alerts.push('Nenhuma sessão recebida no período selecionado.')
  if (sessions > 0 && !events) alerts.push('Há sessões sem eventos recebidos neste período. Verifique o envio dos eventos.')
  if (sessions > 0 && !tokensCreated) alerts.push('Há sessões no período, mas nenhum token novo foi criado. Sessões podem reutilizar tokens existentes.')
  if (tokenPending > 0) alerts.push(`${tokenPending} pedido(s) com token recebido e sessão ainda não resolvida.`)
  if (unattributed > 0) alerts.push(`${unattributed} pedido(s) sem atribuição e sem token pendente.`)
  if (sourceId) alerts.push('O filtro por fonte inclui apenas pedidos já vinculados a essa fonte. Pedidos sem fonte aparecem em Todas as fontes.')

  return {
    start, end, sourceId, sessions, events, tokensCreated, tokensUsed,
    tokenUseRate: tokensCreated > 0 ? tokensUsed / tokensCreated * 100 : null,
    orders, attributed, tokenPending, unattributed, alerts,
  }
}
