'use client'

import {
  BadgeDollarSign,
  CircleDollarSign,
  Landmark,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  WalletCards,
  Wrench,
} from 'lucide-react'


type Costs = {
  total: number

  checkoutFees: number

  taxes: number

  tools: number

  operational: number

  chargebackFees: number

  refundFees: number

  other: number

  count: number
}


type KnownResult = {
  revenue: number

  mediaInvestment: number

  otherKnownCosts: number

  totalKnownCost: number

  operationalResult: number

  roi: number

  margin: number
}


type Props = {
  currency: string

  costs: Costs

  result: KnownResult
}


function formatMoney(
  value: number,
  currency: string
) {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      style:
        'currency',

      currency:
        currency ||
        'BRL',
    }
  ).format(value)
}


function formatPercent(
  value: number
) {
  return `${value.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    }
  )}%`
}


export default function FinanceKnownResult({
  currency,
  costs,
  result,
}: Props) {
  const positive =
    result.operationalResult >=
    0


  return (
    <section className="mt-6">

      {/* ===============================================
          CABEÇALHO
      ================================================ */}

      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
          Resultado
        </p>

        <h2 className="mt-1 text-sm font-semibold text-zinc-200">
          Resultado operacional conhecido
        </h2>

        <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-600">
          Receita aprovada menos investimento em mídia e custos já conhecidos pelo Traffic Flow.
        </p>
      </div>


      {/* ===============================================
          RESULTADO PRINCIPAL
      ================================================ */}

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">

        <section className="rounded-2xl border border-white/[0.06] bg-[#0d0f13] p-5 md:p-6">

          <div className="space-y-4">

            <ResultLine
              label="Receita aprovada"
              value={
                formatMoney(
                  result.revenue,
                  currency
                )
              }
              icon={
                <CircleDollarSign
                  size={15}
                />
              }
            />


            <ResultLine
              label="Investimento Meta"
              value={`- ${formatMoney(
                result.mediaInvestment,
                currency
              )}`}
              icon={
                <BadgeDollarSign
                  size={15}
                />
              }
              muted
            />


            <ResultLine
              label="Outros custos conhecidos"
              value={`- ${formatMoney(
                result.otherKnownCosts,
                currency
              )}`}
              icon={
                <ReceiptText
                  size={15}
                />
              }
              muted
            />


            <div className="border-t border-white/[0.06] pt-4">

              <div className="flex items-center justify-between gap-5">

                <div>
                  <p className="text-xs font-medium text-zinc-400">
                    Resultado conhecido
                  </p>

                  <p className="mt-1 text-[10px] text-zinc-700">
                    Receita - mídia - custos conhecidos
                  </p>
                </div>


                <div className="text-right">

                  <p
                    className={`text-2xl font-semibold tracking-tight ${
                      positive
                        ? 'text-emerald-400'
                        : 'text-red-400'
                    }`}
                  >
                    {formatMoney(
                      result.operationalResult,
                      currency
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* =============================================
            ROI / MARGEM
        ============================================== */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">

          <MetricCard
            title="ROI conhecido"
            value={
              result.totalKnownCost >
              0
                ? formatPercent(
                    result.roi
                  )
                : '—'
            }
            subtitle="Resultado / custo conhecido total"
            positive={
              result.roi >=
              0
            }
          />


          <MetricCard
            title="Margem conhecida"
            value={
              result.revenue >
              0
                ? formatPercent(
                    result.margin
                  )
                : '—'
            }
            subtitle="Resultado / receita aprovada"
            positive={
              result.margin >=
              0
            }
          />
        </div>
      </div>


      {/* ===============================================
          DETALHAMENTO DOS CUSTOS
      ================================================ */}

      <section className="mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d0f13]">

        <div className="border-b border-white/[0.05] p-5 md:p-6">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
                Custos
              </p>

              <h3 className="mt-1 text-sm font-semibold text-zinc-200">
                Custos conhecidos
              </h3>

              <p className="mt-1 text-xs text-zinc-600">
                Custos adicionais ao investimento de mídia.
              </p>
            </div>


            <div className="text-left sm:text-right">

              <p className="text-[10px] text-zinc-700">
                {costs.count}{' '}
                {costs.count ===
                1
                  ? 'lançamento'
                  : 'lançamentos'}
              </p>

              <p className="mt-1 text-lg font-semibold text-zinc-200">
                {formatMoney(
                  costs.total,
                  currency
                )}
              </p>
            </div>
          </div>
        </div>


        <div className="grid sm:grid-cols-2 xl:grid-cols-4">

          <CostItem
            title="Taxas de checkout"
            value={
              costs.checkoutFees
            }
            currency={
              currency
            }
            icon={
              <WalletCards
                size={15}
              />
            }
          />


          <CostItem
            title="Impostos"
            value={
              costs.taxes
            }
            currency={
              currency
            }
            icon={
              <Landmark
                size={15}
              />
            }
          />


          <CostItem
            title="Ferramentas"
            value={
              costs.tools
            }
            currency={
              currency
            }
            icon={
              <Wrench
                size={15}
              />
            }
          />


          <CostItem
            title="Operacional"
            value={
              costs.operational
            }
            currency={
              currency
            }
            icon={
              <ReceiptText
                size={15}
              />
            }
          />


          <CostItem
            title="Taxas de chargeback"
            value={
              costs.chargebackFees
            }
            currency={
              currency
            }
            icon={
              <TrendingDown
                size={15}
              />
            }
          />


          <CostItem
            title="Taxas de reembolso"
            value={
              costs.refundFees
            }
            currency={
              currency
            }
            icon={
              <TrendingDown
                size={15}
              />
            }
          />


          <CostItem
            title="Outros"
            value={
              costs.other
            }
            currency={
              currency
            }
            icon={
              <ReceiptText
                size={15}
              />
            }
          />


          <div className="border-b border-white/[0.04] p-5 sm:border-r xl:border-b-0">

            <div className="flex items-center gap-2 text-zinc-600">

              <TrendingUp
                size={15}
              />

              <p className="text-[10px] font-medium uppercase tracking-[0.08em]">
                Custo conhecido total
              </p>
            </div>


            <p className="mt-3 text-lg font-semibold text-zinc-200">
              {formatMoney(
                result.totalKnownCost,
                currency
              )}
            </p>

            <p className="mt-1 text-[9px] text-zinc-700">
              Inclui mídia
            </p>
          </div>
        </div>
      </section>


      {/* ===============================================
          AVISO
      ================================================ */}

      <div className="mt-3 rounded-xl border border-white/[0.05] bg-white/[0.015] px-4 py-3">

        <p className="text-[10px] leading-5 text-zinc-700">
          Resultado conhecido não representa necessariamente lucro líquido contábil. Taxas, impostos ou despesas ainda não cadastrados não estão incluídos.
        </p>
      </div>
    </section>
  )
}


function ResultLine({
  label,
  value,
  icon,
  muted =
    false,
}: {
  label: string

  value: string

  icon:
    React.ReactNode

  muted?:
    boolean
}) {
  return (
    <div className="flex items-center justify-between gap-5">

      <div className="flex items-center gap-3">

        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.05] bg-white/[0.02] text-zinc-600">
          {icon}
        </div>

        <p className="text-xs text-zinc-500">
          {label}
        </p>
      </div>


      <p
        className={`whitespace-nowrap text-sm font-medium ${
          muted
            ? 'text-zinc-500'
            : 'text-zinc-200'
        }`}
      >
        {value}
      </p>
    </div>
  )
}


function MetricCard({
  title,
  value,
  subtitle,
  positive,
}: {
  title: string

  value: string

  subtitle: string

  positive: boolean
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f13] p-5">

      <p className="text-xs font-medium text-zinc-500">
        {title}
      </p>


      <p
        className={`mt-3 text-2xl font-semibold tracking-tight ${
          value === '—'
            ? 'text-zinc-400'
            : positive
              ? 'text-emerald-400'
              : 'text-red-400'
        }`}
      >
        {value}
      </p>


      <p className="mt-2 text-[10px] text-zinc-700">
        {subtitle}
      </p>
    </div>
  )
}


function CostItem({
  title,
  value,
  currency,
  icon,
}: {
  title: string

  value: number

  currency: string

  icon:
    React.ReactNode
}) {
  return (
    <div className="border-b border-white/[0.04] p-5 sm:border-r xl:border-b-0">

      <div className="flex items-center gap-2 text-zinc-600">

        {icon}

        <p className="text-[10px] font-medium uppercase tracking-[0.08em]">
          {title}
        </p>
      </div>


      <p className="mt-3 text-lg font-semibold text-zinc-300">
        {formatMoney(
          value,
          currency
        )}
      </p>
    </div>
  )
}