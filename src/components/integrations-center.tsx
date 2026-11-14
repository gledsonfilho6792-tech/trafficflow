'use client'

import {
  useState,
  type ReactNode,
} from 'react'

import {
  Blocks,
  CheckCircle2,
  ChevronRight,
  Circle,
  ShoppingCart,
  Target,
} from 'lucide-react'

import {
  createClient,
} from '@/lib/supabase/client'

import CheckoutSetupCard from '@/components/checkout-setup-card'


type Integration = {
  id: string
  provider: string
  integration_type: string
  status: string
}


type Props = {
  projectId: string
  initialIntegrations: Integration[]
}


type Provider = {
  provider: string
  type: string
  name: string
  description: string
  category:
    | 'traffic'
    | 'checkout'
  available: boolean
}


const providers: Provider[] = [
  {
    provider: 'meta',
    type: 'ads',
    name: 'Meta Ads',
    description:
      'Campanhas, conjuntos, anúncios, investimento e métricas.',
    category: 'traffic',
    available: true,
  },

  {
    provider: 'google',
    type: 'ads',
    name: 'Google Ads',
    description:
      'Campanhas e métricas da rede Google.',
    category: 'traffic',
    available: false,
  },

  {
    provider: 'tiktok',
    type: 'ads',
    name: 'TikTok Ads',
    description:
      'Campanhas e métricas do TikTok.',
    category: 'traffic',
    available: false,
  },

  /*
   * =====================================================
   * CHECKOUTS
   * =====================================================
   */

  {
    provider: 'applyfy',
    type: 'checkout',
    name: 'Applyfy',
    description:
      'Pedidos, pagamentos, reembolsos, chargebacks e eventos do checkout.',
    category: 'checkout',
    available: true,
  },

  {
    provider: 'kiwify',
    type: 'checkout',
    name: 'Kiwify',
    description:
      'Pedidos, vendas, reembolsos e dados de checkout.',
    category: 'checkout',
    available: true,
  },

  {
    provider: 'perfectpay',
    type: 'checkout',
    name: 'PerfectPay',
    description:
      'Pedidos, vendas, reembolsos e eventos do checkout.',
    category: 'checkout',
    available: true,
  },
]


export default function IntegrationsCenter({
  projectId,
  initialIntegrations,
}: Props) {
  const [
    integrations,
    setIntegrations,
  ] =
    useState<Integration[]>(
      initialIntegrations
    )

  const [
    loadingProvider,
    setLoadingProvider,
  ] =
    useState<string | null>(
      null
    )

  const [
    message,
    setMessage,
  ] =
    useState('')

  const supabase =
    createClient()


  function findIntegration(
    provider: string,
    type: string
  ) {
    return integrations.find(
      (integration) =>
        integration.provider ===
          provider &&
        integration.integration_type ===
          type
    )
  }


  async function prepareIntegration(
    item: Provider
  ) {
    if (!item.available) {
      return
    }

    /*
     * Applyfy usa o onboarding
     * automático novo.
     *
     * Ela não passa por esta função.
     */
    if (
      item.provider ===
        'applyfy' &&
      item.type ===
        'checkout'
    ) {
      return
    }

    const existing =
      findIntegration(
        item.provider,
        item.type
      )


    /*
     * =====================================================
     * INTEGRAÇÃO JÁ EXISTE
     * =====================================================
     */

    if (existing) {
      if (
        item.provider ===
          'meta' &&
        item.type ===
          'ads'
      ) {
        window.location.assign(new URL(`/api/integrations/meta/connect?projectId=${projectId}`, window.location.origin))

        return
      }

      setMessage(
        `${item.name} já está preparado neste projeto.`
      )

      return
    }


    /*
     * =====================================================
     * PREPARAR NOVA INTEGRAÇÃO
     * =====================================================
     */

    setLoadingProvider(
      item.provider
    )

    setMessage('')


    const {
      data,
      error,
    } =
      await supabase
        .from(
          'integrations'
        )
        .insert({
          project_id:
            projectId,

          provider:
            item.provider,

          integration_type:
            item.type,

          name:
            item.name,

          status:
            'disconnected',

          config: {},
        })
        .select(
          `
          id,
          provider,
          integration_type,
          status
          `
        )
        .single()


    if (error) {
      console.error(
        error
      )

      setMessage(
        `Não foi possível preparar ${item.name}.`
      )

      setLoadingProvider(
        null
      )

      return
    }


    setIntegrations(
      (current) => [
        ...current,
        data,
      ]
    )


    setMessage(
      `${item.name} preparado. Agora podemos configurar a conexão real.`
    )


    /*
     * Meta segue diretamente
     * para OAuth.
     */
    if (
      item.provider ===
        'meta' &&
      item.type ===
        'ads'
    ) {
      window.location.assign(new URL(`/api/integrations/meta/connect?projectId=${projectId}`, window.location.origin))

      return
    }


    setLoadingProvider(
      null
    )
  }


  const trafficProviders =
    providers.filter(
      (provider) =>
        provider.category ===
        'traffic'
    )


  const checkoutProviders =
    providers.filter(
      (provider) =>
        provider.category ===
        'checkout'
    )


  return (
    <div>
      {message && (
        <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-300">
          {message}
        </div>
      )}


      {/* ===================================================
          TRÁFEGO PAGO
      =================================================== */}

      <IntegrationSection
        title="Tráfego pago"
        description="Conecte suas contas de anúncios e importe métricas de mídia."
        items={
          trafficProviders
        }
        integrations={
          integrations
        }
        loadingProvider={
          loadingProvider
        }
        onPrepare={
          prepareIntegration
        }
        icon={
          <Target
            size={18}
          />
        }
      />


      {/* ===================================================
          PLATAFORMAS DE VENDA
      =================================================== */}

      <div className="mt-8">
        <IntegrationSection
          title="Plataformas de venda"
          description="Receba pedidos, pagamentos e eventos dos seus checkouts."
          items={
            checkoutProviders
          }
          integrations={
            integrations
          }
          loadingProvider={
            loadingProvider
          }
          onPrepare={
            prepareIntegration
          }
          icon={
            <ShoppingCart
              size={18}
            />
          }
          projectId={
            projectId
          }
        />
      </div>
    </div>
  )
}


function IntegrationSection({
  title,
  description,
  items,
  integrations,
  loadingProvider,
  onPrepare,
  icon,
  projectId,
}: {
  title: string
  description: string

  items: Provider[]

  integrations:
    Integration[]

  loadingProvider:
    string | null

  onPrepare:
    (
      provider: Provider
    ) => void

  icon: ReactNode

  projectId?: string
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] text-zinc-400">
          {icon}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-zinc-200">
            {title}
          </h2>

          <p className="mt-0.5 text-xs text-zinc-600">
            {description}
          </p>
        </div>
      </div>


      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {items.map(
          (item) => {

            /*
             * ===============================================
             * APPLYFY
             *
             * Primeira integração usando
             * o novo onboarding automático.
             * ===============================================
             */

            if (
  item.provider ===
    'applyfy' &&
  item.type ===
    'checkout' &&
  projectId
) {
  const applyfyIntegration =
    integrations.find(
      (current) =>
        current.provider ===
          'applyfy' &&
        current.integration_type ===
          'checkout'
    )

  return (
    <CheckoutSetupCard
      key="applyfy-checkout"
      projectId={
        projectId
      }
      provider="applyfy"
      title="Applyfy"
      autoLoad={
        Boolean(
          applyfyIntegration
        )
      }
    />
  )
}
            /*
             * ===============================================
             * CARDS GENÉRICOS
             * ===============================================
             */

            const integration =
              integrations.find(
                (current) =>
                  current.provider ===
                    item.provider &&
                  current
                    .integration_type ===
                    item.type
              )

            const prepared =
              Boolean(
                integration
              )


            return (
              <div
                key={`${item.provider}-${item.type}`}
                className="rounded-2xl border border-white/[0.06] bg-[#0d0f13] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.035] text-zinc-400">
                    <Blocks
                      size={19}
                    />
                  </div>


                  {!item.available ? (
                    <span className="rounded-full bg-zinc-800/60 px-2.5 py-1 text-[10px] font-medium text-zinc-500">
                      Em breve
                    </span>
                  ) : prepared ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-400">
                      <Circle
                        size={7}
                        fill="currentColor"
                      />

                      Aguardando conexão
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full bg-zinc-800/60 px-2.5 py-1 text-[10px] text-zinc-500">
                      <Circle
                        size={7}
                      />

                      Não configurado
                    </span>
                  )}
                </div>


                <h3 className="mt-5 text-base font-semibold text-zinc-200">
                  {item.name}
                </h3>


                <p className="mt-2 min-h-10 text-xs leading-5 text-zinc-600">
                  {
                    item.description
                  }
                </p>


                <div className="mt-5 border-t border-white/[0.05] pt-4">
                  {item.available ? (
                    <button
                      type="button"
                      onClick={() =>
                        onPrepare(
                          item
                        )
                      }
                      disabled={
                        loadingProvider ===
                        item.provider
                      }
                      className="flex w-full items-center justify-between text-sm font-medium text-zinc-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span>
                        {loadingProvider ===
                        item.provider
                          ? 'Preparando...'
                          : prepared
                            ? 'Continuar configuração'
                            : 'Configurar integração'}
                      </span>


                      {prepared ? (
                        <CheckCircle2
                          size={16}
                          className="text-amber-400"
                        />
                      ) : (
                        <ChevronRight
                          size={16}
                        />
                      )}
                    </button>
                  ) : (
                    <div className="text-sm text-zinc-700">
                      Disponível em uma versão futura
                    </div>
                  )}
                </div>
              </div>
            )
          }
        )}
      </div>
    </section>
  )
}