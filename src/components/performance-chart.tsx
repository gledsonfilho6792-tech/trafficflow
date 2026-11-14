'use client'

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type ChartRow = {
  date: string
  label: string
  spend: number
  impressions: number
  clicks: number
}

type Props = {
  data: ChartRow[]
}

function formatCurrency(
  value: number
) {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
    }
  ).format(value)
}

function formatNumber(
  value: number
) {
  return new Intl.NumberFormat(
    'pt-BR'
  ).format(value)
}

export default function PerformanceChart({
  data,
}: Props) {
  if (data.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-sm text-zinc-600">
          Nenhum dado disponível para o período.
        </p>
      </div>
    )
  }

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <ComposedChart
          data={data}
          margin={{
            top: 10,
            right: 10,
            left: 0,
            bottom: 0,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />

          <XAxis
            dataKey="label"
            tick={{
              fill: '#71717a',
              fontSize: 11,
            }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            yAxisId="money"
            tick={{
              fill: '#71717a',
              fontSize: 11,
            }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) =>
              `R$ ${Number(
                value
              ).toLocaleString(
                'pt-BR',
                {
                  maximumFractionDigits: 0,
                }
              )}`
            }
          />

          <YAxis
            yAxisId="volume"
            orientation="right"
            tick={{
              fill: '#71717a',
              fontSize: 11,
            }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) =>
              Number(
                value
              ).toLocaleString(
                'pt-BR'
              )
            }
          />

          <Tooltip
            content={({
              active,
              payload,
              label,
            }) => {
              if (
                !active ||
                !payload?.length
              ) {
                return null
              }

              const row =
                payload[0]
                  ?.payload as ChartRow

              return (
                <div className="rounded-xl border border-white/[0.08] bg-[#111318] p-4 shadow-2xl">
                  <p className="text-xs font-medium text-zinc-300">
                    {label}
                  </p>

                  <div className="mt-3 space-y-2 text-xs">
                    <p className="text-zinc-400">
                      Investimento:{' '}
                      <span className="text-white">
                        {formatCurrency(
                          row.spend
                        )}
                      </span>
                    </p>

                    <p className="text-zinc-400">
                      Impressões:{' '}
                      <span className="text-white">
                        {formatNumber(
                          row.impressions
                        )}
                      </span>
                    </p>

                    <p className="text-zinc-400">
                      Cliques:{' '}
                      <span className="text-white">
                        {formatNumber(
                          row.clicks
                        )}
                      </span>
                    </p>
                  </div>
                </div>
              )
            }}
          />

          <Bar
            yAxisId="money"
            dataKey="spend"
            name="Investimento"
            fill="#10b981"
            radius={[5, 5, 0, 0]}
            maxBarSize={38}
          />

          <Line
            yAxisId="volume"
            type="monotone"
            dataKey="clicks"
            name="Cliques"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 4,
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}