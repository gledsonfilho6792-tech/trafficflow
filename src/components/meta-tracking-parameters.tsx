'use client'

import {
  useState,
} from 'react'

import {
  Check,
  Clipboard,
  Info,
  MousePointerClick,
} from 'lucide-react'


const essentialTemplate =
  'tf_campaign_id={{campaign.id}}&tf_adset_id={{adset.id}}&tf_ad_id={{ad.id}}&tf_placement={{placement}}&tf_site_source={{site_source_name}}'


const completeTemplate =
  'utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}&tf_campaign_id={{campaign.id}}&tf_adset_id={{adset.id}}&tf_ad_id={{ad.id}}&tf_placement={{placement}}&tf_site_source={{site_source_name}}'


type CopiedType =
  | 'essential'
  | 'complete'
  | null


export default function MetaTrackingParameters() {
  const [
    copied,
    setCopied,
  ] =
    useState<CopiedType>(
      null
    )


  async function copyValue(
    type:
      Exclude<
        CopiedType,
        null
      >,
    value: string
  ) {
    try {
      await navigator
        .clipboard
        .writeText(
          value
        )


      setCopied(
        type
      )


      window.setTimeout(
        () => {
          setCopied(
            null
          )
        },
        1600
      )
    } catch {
      // O navegador pode bloquear
      // clipboard em alguns contextos.
    }
  }


  return (
    <section className="mt-8 rounded-2xl border border-white/[0.06] bg-[#0d0f13]">

      {/* HEADER */}

      <div className="border-b border-white/[0.05] p-5 md:p-6">

        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
          Meta Ads
        </p>

        <h2 className="mt-1 text-sm font-semibold text-zinc-200">
          Parâmetros de atribuição
        </h2>

        <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-600">
          Use estes parâmetros no campo URL Parameters dos anúncios para o Traffic Flow identificar campanha, conjunto, anúncio e posicionamento automaticamente.
        </p>
      </div>


      {/* ESSENCIAL */}

      <div className="border-b border-white/[0.05] p-5 md:p-6">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

          <div>
            <p className="text-xs font-medium text-zinc-300">
              Traffic Flow — Essencial
            </p>

            <p className="mt-1 text-[10px] leading-4 text-zinc-600">
              Recomendado se você já utiliza suas próprias UTMs.
            </p>
          </div>


          <span className="w-fit rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-2.5 py-1 text-[10px] font-medium text-emerald-400">
            Recomendado
          </span>
        </div>


        <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/30 p-4">
          <code className="break-all font-mono text-xs leading-6 text-zinc-400">
            {
              essentialTemplate
            }
          </code>
        </div>


        <button
          type="button"
          onClick={() =>
            copyValue(
              'essential',
              essentialTemplate
            )
          }
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2 text-xs text-zinc-300 transition hover:bg-white/[0.05]"
        >
          {copied ===
          'essential' ? (
            <>
              <Check
                size={14}
              />

              Copiado
            </>
          ) : (
            <>
              <Clipboard
                size={14}
              />

              Copiar parâmetros
            </>
          )}
        </button>
      </div>


      {/* COMPLETO */}

      <div className="border-b border-white/[0.05] p-5 md:p-6">

        <div>
          <p className="text-xs font-medium text-zinc-300">
            Modelo completo com UTMs
          </p>

          <p className="mt-1 text-[10px] leading-4 text-zinc-600">
            Use somente se o anúncio ainda não possui uma estrutura própria de UTMs.
          </p>
        </div>


        <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/30 p-4">
          <code className="break-all font-mono text-xs leading-6 text-zinc-400">
            {
              completeTemplate
            }
          </code>
        </div>


        <button
          type="button"
          onClick={() =>
            copyValue(
              'complete',
              completeTemplate
            )
          }
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2 text-xs text-zinc-300 transition hover:bg-white/[0.05]"
        >
          {copied ===
          'complete' ? (
            <>
              <Check
                size={14}
              />

              Copiado
            </>
          ) : (
            <>
              <Clipboard
                size={14}
              />

              Copiar modelo completo
            </>
          )}
        </button>
      </div>


      {/* COMO FUNCIONA */}

      <div className="border-b border-white/[0.05] p-5 md:p-6">

        <div className="flex items-center gap-2">
          <MousePointerClick
            size={14}
            className="text-zinc-600"
          />

          <p className="text-xs font-medium text-zinc-400">
            O que acontece no clique
          </p>
        </div>


        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">

          <ParameterCard
            name="tf_campaign_id"
            value="{{campaign.id}}"
            description="Campanha"
          />

          <ParameterCard
            name="tf_adset_id"
            value="{{adset.id}}"
            description="Conjunto"
          />

          <ParameterCard
            name="tf_ad_id"
            value="{{ad.id}}"
            description="Anúncio"
          />

          <ParameterCard
            name="tf_placement"
            value="{{placement}}"
            description="Posicionamento"
          />

          <ParameterCard
            name="tf_site_source"
            value="{{site_source_name}}"
            description="Origem Meta"
          />
        </div>


        <div className="mt-5 rounded-xl border border-white/[0.05] bg-black/10 p-4">
          <p className="text-[10px] leading-5 text-zinc-600">
            Quando o usuário clicar no anúncio, a Meta substitui os valores dinâmicos pelos IDs e informações reais. O script do Traffic Flow captura esses parâmetros ao carregar a página e os grava na sessão.
          </p>
        </div>
      </div>


      {/* FLUXO */}

      <div className="border-b border-white/[0.05] p-5 md:p-6">

        <p className="text-xs font-medium text-zinc-400">
          Fluxo de atribuição
        </p>


        <div className="mt-4 overflow-x-auto">
          <div className="flex min-w-[760px] items-center gap-2 text-[10px]">

            <FlowStep>
              Anúncio Meta
            </FlowStep>

            <Arrow />

            <FlowStep>
              Parâmetros dinâmicos
            </FlowStep>

            <Arrow />

            <FlowStep>
              Landing Page
            </FlowStep>

            <Arrow />

            <FlowStep>
              Sessão Traffic Flow
            </FlowStep>

            <Arrow />

            <FlowStep>
              Checkout
            </FlowStep>

            <Arrow />

            <FlowStep>
              Venda atribuída
            </FlowStep>
          </div>
        </div>
      </div>


      {/* INSTRUÇÕES */}

      <div className="p-5 md:p-6">

        <div className="flex items-start gap-3 rounded-xl border border-blue-500/15 bg-blue-500/[0.04] p-4">

          <Info
            size={16}
            className="mt-0.5 shrink-0 text-blue-400"
          />

          <div>
            <p className="text-xs font-medium text-zinc-300">
              Onde colocar
            </p>

            <p className="mt-1 text-[10px] leading-5 text-zinc-600">
              No Meta Ads Manager, estes valores devem ser colados no campo de parâmetros da URL do anúncio. Como esse campo recebe apenas os parâmetros, o modelo acima não começa com “?”.
            </p>

            <p className="mt-2 text-[10px] leading-5 text-zinc-600">
              Não configure nada agora na campanha real. Faremos essa instalação de forma controlada quando chegarmos ao teste da PV.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}


function ParameterCard({
  name,
  value,
  description,
}: {
  name: string
  value: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-black/10 p-3">
      <p className="text-[10px] font-medium text-zinc-300">
        {description}
      </p>

      <p className="mt-2 break-all font-mono text-[10px] text-emerald-400">
        {value}
      </p>

      <p className="mt-2 break-all font-mono text-[9px] text-zinc-700">
        {name}
      </p>
    </div>
  )
}


function FlowStep({
  children,
}: {
  children:
    React.ReactNode
}) {
  return (
    <div className="flex min-h-[54px] min-w-[110px] items-center justify-center rounded-xl border border-white/[0.06] bg-black/10 px-3 text-center font-medium text-zinc-400">
      {children}
    </div>
  )
}


function Arrow() {
  return (
    <span className="text-zinc-700">
      →
    </span>
  )
}