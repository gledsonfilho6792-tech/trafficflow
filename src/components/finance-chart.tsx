'use client'

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'


type Item = {
  date: string

  investment: number

  approvedRevenue: number

  metaAttributedRevenue: number

  approvedOrders: number

  metaAttributedOrders: number
}


type Props = {
  data: Item[]

  currency: string
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

      maximumFractionDigits:
        2,
    }
  ).format(value)
}


function labelDate(
  value: string
) {
  const [
    year,
    month,
    day,
  ] =
    value.split('-')


  if (
    !year ||
    !month ||
    !day
  ) {
    return value
  }


  return `${day}/${month}`
}


export default function FinanceChart({
  data,
  currency,
}: Props) {
  const chartData =
    data.map(
      (
        item
      ) => ({
        ...item,

        label:
          labelDate(
            item.date
          ),
      })
    )


  return (
    <div className="h-[340px] w-full">

      {chartData.length ===
      0 ? (
        <div className="flex h-full items-center justify-center text-sm text-zinc-600">
          Nenhum dado disponível no período.
        </div>
      ) : (
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <LineChart
            data={
              chartData
            }
            margin={{
              top: 10,
              right: 20,
              bottom: 0,
              left: 0,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={
                false
              }
            />


            <XAxis
              dataKey="label"
              tick={{
                fill:
                  '#71717a',

                fontSize:
                  11,
              }}
              axisLine={
                false
              }
              tickLine={
                false
              }
            />


            <YAxis
              tick={{
                fill:
                  '#71717a',

                fontSize:
                  11,
              }}
              axisLine={
                false
              }
              tickLine={
                false
              }
              tickFormatter={(
                value
              ) =>
                Number(
                  value
                ).toLocaleString(
                  'pt-BR',
                  {
                    notation:
                      'compact',

                    maximumFractionDigits:
                      1,
                  }
                )
              }
            />


            <Tooltip
  contentStyle={{
    background:
      '#111318',

    border:
      '1px solid rgba(255,255,255,0.08)',

    borderRadius:
      '12px',

    fontSize:
      '12px',
  }}
  labelStyle={{
    color:
      '#a1a1aa',
  }}
  formatter={(
    value,
    name
  ) => {
    const numeric =
      Number(
        value ?? 0
      )


    const metricName =
      String(
        name ?? ''
      )


    const label =
      metricName ===
      'investment'
        ? 'Investimento'
        : metricName ===
          'approvedRevenue'
          ? 'Receita aprovada'
          : metricName ===
            'metaAttributedRevenue'
            ? 'Receita Meta atribuída'
            : metricName


    return [
      formatMoney(
        Number.isFinite(
          numeric
        )
          ? numeric
          : 0,
        currency
      ),

      label,
    ]
  }}
/>

            <Legend
              formatter={(
                value
              ) => {
                if (
                  value ===
                  'investment'
                ) {
                  return 'Investimento'
                }


                if (
                  value ===
                  'approvedRevenue'
                ) {
                  return 'Receita aprovada'
                }


                return 'Receita Meta atribuída'
              }}
              wrapperStyle={{
                fontSize:
                  '11px',

                paddingTop:
                  '14px',
              }}
            />


            <Line
              type="monotone"
              dataKey="investment"
              stroke="#71717a"
              strokeWidth={
                2
              }
              dot={
                false
              }
              activeDot={{
                r: 4,
              }}
            />


            <Line
              type="monotone"
              dataKey="approvedRevenue"
              stroke="#22c55e"
              strokeWidth={
                2
              }
              dot={
                false
              }
              activeDot={{
                r: 4,
              }}
            />


            <Line
              type="monotone"
              dataKey="metaAttributedRevenue"
              stroke="#14b8a6"
              strokeWidth={
                2
              }
              dot={
                false
              }
              activeDot={{
                r: 4,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}