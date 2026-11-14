'use client'

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'


type ChartRow = {
  date: string
  label: string

  investment: number
  revenue: number
  result: number
}


type Props = {
  data: ChartRow[]
  currency?: string
}


function formatCurrency(
  value: number,
  currency: string
) {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      style:
        'currency',

      currency,

      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    }
  ).format(
    value
  )
}


function formatAxisValue(
  value: number
) {
  if (
    Math.abs(
      value
    ) >=
    1000
  ) {
    return `${(
      value /
      1000
    ).toLocaleString(
      'pt-BR',
      {
        maximumFractionDigits:
          1,
      }
    )}k`
  }


  return value.toLocaleString(
    'pt-BR',
    {
      maximumFractionDigits:
        0,
    }
  )
}


export default function DashboardFinancialChart({
  data,
  currency =
    'BRL',
}: Props) {
  return (
    <div className="h-[340px] w-full">

      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <ComposedChart
          data={
            data
          }
          margin={{
            top:
              10,

            right:
              10,

            bottom:
              0,

            left:
              0,
          }}
        >

          <CartesianGrid
            stroke="rgba(255,255,255,0.05)"
            vertical={
              false
            }
          />


          <XAxis
            dataKey="label"
            axisLine={
              false
            }
            tickLine={
              false
            }
            tick={{
              fill:
                '#71717a',

              fontSize:
                11,
            }}
            minTickGap={
              24
            }
          />


          <YAxis
            axisLine={
              false
            }
            tickLine={
              false
            }
            tick={{
              fill:
                '#71717a',

              fontSize:
                11,
            }}
            tickFormatter={
              formatAxisValue
            }
            width={
              54
            }
          />


          <Tooltip
            cursor={{
              fill:
                'rgba(255,255,255,0.025)',
            }}
            contentStyle={{
              background:
                '#111317',

              border:
                '1px solid rgba(255,255,255,0.08)',

              borderRadius:
                '12px',

              color:
                '#f4f4f5',
            }}
            labelStyle={{
              color:
                '#a1a1aa',

              marginBottom:
                '6px',
            }}
            formatter={(
              value
            ) =>
              formatCurrency(
                Number(
                  value ??
                  0
                ),
                currency
              )
            }
          />


          <Legend
            wrapperStyle={{
              fontSize:
                '11px',

              paddingTop:
                '16px',
            }}
          />


          <ReferenceLine
            y={
              0
            }
            stroke="rgba(255,255,255,0.12)"
          />


          <Bar
            dataKey="investment"
            name="Investimento"
            fill="#52525b"
            radius={[
              4,
              4,
              0,
              0,
            ]}
            maxBarSize={
              26
            }
          />


          <Line
            type="monotone"
            dataKey="revenue"
            name="Receita aprovada"
            stroke="#10b981"
            strokeWidth={
              2
            }
            dot={
              false
            }
            activeDot={{
              r:
                4,
            }}
          />


          <Line
            type="monotone"
            dataKey="result"
            name="Resultado conhecido"
            stroke="#38bdf8"
            strokeWidth={
              2
            }
            dot={
              false
            }
            activeDot={{
              r:
                4,
            }}
          />

        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}