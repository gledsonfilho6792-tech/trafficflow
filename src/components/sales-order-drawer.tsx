'use client'

import { deferEffect } from '@/lib/defer-effect'

import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  RefreshCw,
  X,
} from 'lucide-react'


type Props = {
  projectId: string
  orderId: string | null
  onClose: () => void
}


type DetailResponse = {
  ok: boolean
  error?: string

  project?: {
    id: string
    name: string
    timezone: string | null
    currency: string
  }

  order?: {
    id: string
    provider: string

    external_order_id:
      string | null

    external_transaction_id:
      string | null

    transaction_identifier:
      string | null

    status: string
    currency: string | null

    gross_amount:
      number | string | null

    net_amount:
      number | string | null

    payment_method:
      string | null

    installments:
      number | null

    offer_code:
      string | null

    paid_at:
      string | null

    provider_created_at:
      string | null

    customer_name:
      string | null

    customer_email:
      string | null

    customer_phone:
      string | null

    customer_country:
      string | null

    customer_state:
      string | null

    customer_city:
      string | null

    subscription_external_id:
      string | null

    subscription_status:
      string | null

    charge_amount:
      number | string | null

    commission_amount:
      number | string | null

    dispute_id:
      string | null

    dispute_type:
      string | null

    dispute_status:
      string | null

    dispute_amount:
      number | string | null

    dispute_fine_amount:
      number | string | null

    dispute_origin:
      string | null

    dispute_details:
      string | null

    attribution_token:
      string | null

    attribution_method:
      string | null

    attributed_at:
      string | null

    created_at: string
    updated_at: string
  }

  attribution?: {
    is_attributed: boolean

    attribution_status:
      string

    attribution_method:
      string | null

    attribution_token:
      string | null

    session_id:
      string | null

    visitor_id:
      string | null

    utm_source:
      string | null

    utm_medium:
      string | null

    utm_campaign:
      string | null

    utm_content:
      string | null

    utm_term:
      string | null

    campaign_name:
      string | null

    campaign_external_id:
      string | null

    ad_set_name:
      string | null

    ad_set_external_id:
      string | null

    ad_name:
      string | null

    ad_external_id:
      string | null

    meta_placement:
      string | null

    meta_site_source:
      string | null
  } | null

  tracking?: {
    session:
      | {
          visitor_id?: string
          session_id?: string

          started_at?: string
          last_seen_at?: string

          landing_url?:
            string | null

          referrer?:
            string | null

          country?:
            string | null

          region?:
            string | null

          city?:
            string | null

          fbclid?:
            string | null

          fbp?:
            string | null

          fbc?:
            string | null

          gclid?:
            string | null

          ttclid?:
            string | null
        }
      | null

    source:
      | {
          name?: string
          domain?: string | null
          is_active?: boolean
        }
      | null
  }

  events?: {
    id: string
    provider: string
    event_type: string
    external_event_id:
      string | null

    normalized_status:
      string | null

    event_at: string
    created_at: string
  }[]
}


function numberValue(
  value:
    | number
    | string
    | null
    | undefined
) {
  const parsed =
    Number(
      value ?? 0
    )


  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0
}


function formatProvider(
  provider:
    | string
    | undefined
) {
  if (!provider) {
    return '—'
  }


  const map:
    Record<
      string,
      string
    > = {
    applyfy:
      'Applyfy',

    hotmart:
      'Hotmart',

    mundpay:
      'Mundpay',

    wiven:
      'Wiven',

    perfectpay:
      'PerfectPay',

    cartpanda:
      'Cartpanda',

    kiwify:
      'Kiwify',

    greenn:
      'Greenn',

    payt:
      'Payt',
  }


  return (
    map[
      provider
        .toLowerCase()
    ] ??
    provider
  )
}


function formatStatus(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return '—'
  }


  const map:
    Record<
      string,
      string
    > = {
    paid:
      'Pago',

    pending:
      'Pendente',

    refunded:
      'Reembolsado',

    chargeback:
      'Chargeback',

    canceled:
      'Cancelado',

    disputed:
      'Em disputa',
  }


  return (
    map[value] ??
    value
  )
}


function statusClasses(
  status:
    | string
    | undefined
) {
  switch (status) {
    case 'paid':
      return 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-400'

    case 'pending':
      return 'border-amber-500/20 bg-amber-500/[0.07] text-amber-400'

    case 'refunded':
      return 'border-blue-500/20 bg-blue-500/[0.07] text-blue-400'

    case 'chargeback':
    case 'disputed':
      return 'border-red-500/20 bg-red-500/[0.07] text-red-400'

    default:
      return 'border-white/[0.07] bg-white/[0.03] text-zinc-500'
  }
}


function formatPayment(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return '—'
  }


  const map:
    Record<
      string,
      string
    > = {
    pix:
      'PIX',

    credit_card:
      'Cartão',

    card:
      'Cartão',

    boleto:
      'Boleto',
  }


  return (
    map[
      value
        .toLowerCase()
    ] ??
    value
  )
}


function formatDateTime(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return '—'
  }


  const date =
    new Date(value)


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '—'
  }


  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      dateStyle:
        'short',

      timeStyle:
        'short',
    }
  ).format(date)
}


function eventLabel(
  eventType: string,
  normalizedStatus:
    | string
    | null
) {
  const upper =
    eventType
      .toUpperCase()


  if (
    upper.includes(
      'CHARGEBACK'
    )
  ) {
    return 'Chargeback'
  }


  if (
    upper.includes(
      'REFUND'
    )
  ) {
    return 'Reembolso'
  }


  if (
    upper.includes(
      'CANCEL'
    )
  ) {
    return 'Cancelamento'
  }


  if (
    upper.includes(
      'PAID'
    )
  ) {
    return 'Pagamento aprovado'
  }


  if (
    upper.includes(
      'CREATED'
    )
  ) {
    return 'Pedido criado'
  }


  if (
    normalizedStatus
  ) {
    return formatStatus(
      normalizedStatus
    )
  }


  return eventType
}


export default function SalesOrderDrawer({
  projectId,
  orderId,
  onClose,
}: Props) {
  const [
    data,
    setData,
  ] =
    useState<
      DetailResponse | null
    >(null)


  const [
    loading,
    setLoading,
  ] =
    useState(false)


  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false)


  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null)


  const loadDetails =
    useCallback(
      async (
        silent = false
      ) => {
        if (!orderId) {
          return
        }


        if (silent) {
          setRefreshing(true)
        } else {
          setLoading(true)
          setData(null)
        }


        setError(null)


        try {
          const params =
            new URLSearchParams({
              projectId,
              orderId,
            })


          const response =
            await fetch(
              `/api/sales-detail?${params.toString()}`,
              {
                cache:
                  'no-store',
              }
            )


          const result:
            DetailResponse =
            await response
              .json()


          if (
            !response.ok ||
            !result.ok
          ) {
            throw new Error(
              result.error ??
                'Não foi possível carregar a venda.'
            )
          }


          setData(result)
        } catch (
          error
        ) {
          setError(
            error instanceof Error
              ? error.message
              : 'Erro inesperado.'
          )
        } finally {
          setLoading(false)
          setRefreshing(false)
        }
      },
      [
        projectId,
        orderId,
      ]
    )


  useEffect(() => deferEffect(() => {
    if (!orderId) {
      setData(null)
      setError(null)

      return
    }


    void loadDetails()
  }), [
    orderId,
    loadDetails,
  ])


  /*
   * ESC + bloquear scroll
   */

  useEffect(() => {
    if (!orderId) {
      return
    }


    const previousOverflow =
      document.body
        .style
        .overflow


    document.body
      .style
      .overflow =
      'hidden'


    function keydown(
      event:
        KeyboardEvent
    ) {
      if (
        event.key ===
        'Escape'
      ) {
        onClose()
      }
    }


    window.addEventListener(
      'keydown',
      keydown
    )


    return () => {
      document.body
        .style
        .overflow =
        previousOverflow


      window.removeEventListener(
        'keydown',
        keydown
      )
    }
  }, [
    orderId,
    onClose,
  ])


  /*
   * Atualiza venda aberta.
   */

  useEffect(() => {
    if (!orderId) {
      return
    }


    const interval =
      window.setInterval(
        () => {
          if (
            document
              .visibilityState ===
            'visible'
          ) {
            void loadDetails(
              true
            )
          }
        },
        15000
      )


    return () => {
      window.clearInterval(
        interval
      )
    }
  }, [
    orderId,
    loadDetails,
  ])


  if (!orderId) {
    return null
  }


  const order =
    data?.order


  const attribution =
    data?.attribution


  const session =
    data?.tracking
      ?.session


  const source =
    data?.tracking
      ?.source


  const events =
    data?.events ??
    []


  const currency =
    order?.currency ??
    data?.project
      ?.currency ??
    'BRL'


  const money =
    new Intl.NumberFormat(
      'pt-BR',
      {
        style:
          'currency',

        currency,
      }
    )


  return (
    <div className="fixed inset-0 z-50">

      {/* BACKDROP */}

      <button
        type="button"
        aria-label="Fechar"
        onClick={
          onClose
        }
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
      />


      {/* DRAWER */}

      <aside className="absolute right-0 top-0 h-full w-full max-w-[620px] overflow-y-auto border-l border-white/[0.07] bg-[#0b0d10] shadow-2xl">

        {/* HEADER */}

        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/[0.06] bg-[#0b0d10]/95 p-5 backdrop-blur md:p-6">

          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
              Venda
            </p>

            <h2 className="mt-1 text-lg font-semibold text-white">
              Detalhes do pedido
            </h2>

            {order && (
              <p className="mt-1 max-w-[430px] truncate font-mono text-[10px] text-zinc-600">
                {order.external_order_id ??
                  order.external_transaction_id ??
                  order.transaction_identifier ??
                  order.id}
              </p>
            )}
          </div>


          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                loadDetails(
                  true
                )
              }
              disabled={
                refreshing
              }
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-200"
            >
              <RefreshCw
                size={15}
                className={
                  refreshing
                    ? 'animate-spin'
                    : ''
                }
              />
            </button>


            <button
              type="button"
              onClick={
                onClose
              }
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] text-zinc-500 transition hover:bg-white/[0.04] hover:text-white"
            >
              <X
                size={17}
              />
            </button>
          </div>
        </div>


        {loading ? (
          <div className="flex min-h-[500px] items-center justify-center">
            <RefreshCw
              size={18}
              className="animate-spin text-zinc-600"
            />
          </div>
        ) : error ? (
          <div className="m-6 rounded-xl border border-red-500/20 bg-red-500/[0.05] p-4 text-xs text-red-400">
            {error}
          </div>
        ) : order ? (
          <div className="space-y-6 p-5 md:p-6">

            {/* RESUMO */}

            <section className="rounded-2xl border border-white/[0.06] bg-[#0d0f13] p-5">

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-3xl font-semibold tracking-tight text-white">
                    {money.format(
                      numberValue(
                        order.gross_amount
                      )
                    )}
                  </p>

                  <p className="mt-2 text-xs text-zinc-600">
                    {formatProvider(
                      order.provider
                    )}{' '}
                    •{' '}
                    {formatPayment(
                      order.payment_method
                    )}
                  </p>
                </div>


                <span
                  className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${statusClasses(
                    order.status
                  )}`}
                >
                  {formatStatus(
                    order.status
                  )}
                </span>
              </div>


              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Info
                  label="Criado"
                  value={
                    formatDateTime(
                      order.provider_created_at ??
                      order.created_at
                    )
                  }
                />

                <Info
                  label="Pago em"
                  value={
                    formatDateTime(
                      order.paid_at
                    )
                  }
                />

                <Info
                  label="Parcelas"
                  value={
                    order.installments
                      ? `${order.installments}x`
                      : '—'
                  }
                />

                <Info
                  label="Oferta"
                  value={
                    order.offer_code ??
                    '—'
                  }
                />
              </div>
            </section>


            {/* CLIENTE */}

            <Section
              title="Cliente"
            >
              <Info
                label="Nome"
                value={
                  order.customer_name ??
                  '—'
                }
              />

              <Info
                label="E-mail"
                value={
                  order.customer_email ??
                  '—'
                }
              />

              <Info
                label="Telefone"
                value={
                  order.customer_phone ??
                  '—'
                }
              />

              <Info
                label="Localização"
                value={
                  [
                    order.customer_city,
                    order.customer_state,
                    order.customer_country,
                  ]
                    .filter(Boolean)
                    .join(' / ') ||
                  '—'
                }
              />
            </Section>


            {/* ATRIBUIÇÃO */}

            <Section
              title="Atribuição"
            >
              <Info
                label="Status"
                value={
                  attribution
                    ?.is_attributed
                    ? 'Atribuída'
                    : 'Não atribuída'
                }
                positive={
                  attribution
                    ?.is_attributed
                }
              />

              <Info
                label="Método"
                value={
                  attribution
                    ?.attribution_method ??
                  order.attribution_method ??
                  '—'
                }
              />

              <Info
                label="Campanha"
                value={
                  attribution
                    ?.campaign_name ??
                  '—'
                }
              />

              <Info
                label="Conjunto"
                value={
                  attribution
                    ?.ad_set_name ??
                  '—'
                }
              />

              <Info
                label="Anúncio"
                value={
                  attribution
                    ?.ad_name ??
                  '—'
                }
              />

              <Info
                label="Posicionamento"
                value={
                  [
                    attribution
                      ?.meta_site_source,
                    attribution
                      ?.meta_placement,
                  ]
                    .filter(Boolean)
                    .join(' / ') ||
                  '—'
                }
              />
            </Section>


            {/* TRACKING */}

            <Section
              title="Tracking"
            >
              <Info
                label="Fonte"
                value={
                  source?.name ??
                  '—'
                }
              />

              <Info
                label="Session ID"
                value={
                  attribution
                    ?.session_id ??
                  session?.session_id ??
                  '—'
                }
                mono
              />

              <Info
                label="Visitor ID"
                value={
                  attribution
                    ?.visitor_id ??
                  session?.visitor_id ??
                  '—'
                }
                mono
              />

              <Info
                label="Attribution Token"
                value={
                  attribution
                    ?.attribution_token ??
                  order.attribution_token ??
                  '—'
                }
                mono
              />

              <Info
                label="Landing Page"
                value={
                  session
                    ?.landing_url ??
                  '—'
                }
              />

              <Info
                label="Referrer"
                value={
                  session
                    ?.referrer ??
                  '—'
                }
              />
            </Section>


            {/* UTMs */}

            <Section
              title="UTMs e identificadores"
            >
              <Info
                label="utm_source"
                value={
                  attribution
                    ?.utm_source ??
                  '—'
                }
                mono
              />

              <Info
                label="utm_medium"
                value={
                  attribution
                    ?.utm_medium ??
                  '—'
                }
                mono
              />

              <Info
                label="utm_campaign"
                value={
                  attribution
                    ?.utm_campaign ??
                  '—'
                }
                mono
              />

              <Info
                label="utm_content"
                value={
                  attribution
                    ?.utm_content ??
                  '—'
                }
                mono
              />

              <Info
                label="utm_term"
                value={
                  attribution
                    ?.utm_term ??
                  '—'
                }
                mono
              />

              <Info
                label="fbclid"
                value={
                  session
                    ?.fbclid ??
                  '—'
                }
                mono
              />

              <Info
                label="gclid"
                value={
                  session
                    ?.gclid ??
                  '—'
                }
                mono
              />

              <Info
                label="ttclid"
                value={
                  session
                    ?.ttclid ??
                  '—'
                }
                mono
              />
            </Section>


            {/* FINANCEIRO */}

            <Section
              title="Financeiro"
            >
              <Info
                label="Valor bruto"
                value={
                  money.format(
                    numberValue(
                      order.gross_amount
                    )
                  )
                }
              />

              <Info
                label="Valor líquido informado"
                value={
                  order.net_amount !==
                  null
                    ? money.format(
                        numberValue(
                          order.net_amount
                        )
                      )
                    : '—'
                }
              />

              <Info
                label="Comissão informada"
                value={
                  order.commission_amount !==
                  null
                    ? money.format(
                        numberValue(
                          order.commission_amount
                        )
                      )
                    : '—'
                }
              />

              <Info
                label="Valor de cobrança"
                value={
                  order.charge_amount !==
                  null
                    ? money.format(
                        numberValue(
                          order.charge_amount
                        )
                      )
                    : '—'
                }
              />
            </Section>


            {/* DISPUTA */}

            {(
              order.dispute_id ||
              order.dispute_status ||
              order.dispute_type
            ) && (
              <Section
                title="Disputa / Chargeback"
              >
                <Info
                  label="Tipo"
                  value={
                    order.dispute_type ??
                    '—'
                  }
                />

                <Info
                  label="Status"
                  value={
                    order.dispute_status ??
                    '—'
                  }
                />

                <Info
                  label="Origem"
                  value={
                    order.dispute_origin ??
                    '—'
                  }
                />

                <Info
                  label="Detalhes"
                  value={
                    order.dispute_details ??
                    '—'
                  }
                />
              </Section>
            )}


            {/* TIMELINE */}

            <section className="rounded-2xl border border-white/[0.06] bg-[#0d0f13] p-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
                Timeline
              </p>

              <h3 className="mt-1 text-sm font-semibold text-zinc-200">
                Ciclo de vida
              </h3>


              <div className="mt-5">
                {events.length ===
                0 ? (
                  <p className="text-xs text-zinc-600">
                    Nenhum evento registrado.
                  </p>
                ) : (
                  events.map(
                    (
                      event,
                      index
                    ) => (
                      <div
                        key={
                          event.id
                        }
                        className="relative flex gap-4 pb-6 last:pb-0"
                      >
                        {index <
                          events.length -
                            1 && (
                          <span className="absolute left-[5px] top-3 h-full w-px bg-white/[0.06]" />
                        )}


                        <span className="relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-[#0d0f13] bg-emerald-400" />


                        <div className="min-w-0">
                          <p className="text-xs font-medium text-zinc-300">
                            {eventLabel(
                              event.event_type,
                              event.normalized_status
                            )}
                          </p>

                          <p className="mt-1 text-[10px] text-zinc-600">
                            {formatDateTime(
                              event.event_at
                            )}
                          </p>

                          <p className="mt-1 text-[9px] text-zinc-700">
                            {event.event_type}
                          </p>
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            </section>
          </div>
        ) : null}
      </aside>
    </div>
  )
}


function Section({
  title,
  children,
}: {
  title: string

  children:
    React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-[#0d0f13] p-5">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
        {title}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {children}
      </div>
    </section>
  )
}


function Info({
  label,
  value,
  mono = false,
  positive = false,
}: {
  label: string

  value:
    string |
    number |
    null |
    undefined

  mono?: boolean

  positive?: boolean
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.045] bg-black/10 p-3">
      <p className="text-[9px] font-medium uppercase tracking-[0.08em] text-zinc-700">
        {label}
      </p>

      <p
        className={`mt-1.5 break-words text-xs ${
          positive
            ? 'text-emerald-400'
            : 'text-zinc-400'
        } ${
          mono
            ? 'font-mono'
            : ''
        }`}
      >
        {value || '—'}
      </p>
    </div>
  )
}