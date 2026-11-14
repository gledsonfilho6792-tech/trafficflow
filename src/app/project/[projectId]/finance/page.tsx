import {
  createClient,
} from '@/lib/supabase/server'

import FinanceCenter from '@/components/finance-center'


type Props = {
  params: Promise<{
    projectId: string
  }>
}


function formatDateInTimezone(
  date: Date,
  timeZone: string
) {
  const parts =
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone,

        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit',
      }
    ).formatToParts(
      date
    )


  const year =
    parts.find(
      (
        part
      ) =>
        part.type ===
        'year'
    )?.value ?? ''


  const month =
    parts.find(
      (
        part
      ) =>
        part.type ===
        'month'
    )?.value ?? ''


  const day =
    parts.find(
      (
        part
      ) =>
        part.type ===
        'day'
    )?.value ?? ''


  return `${year}-${month}-${day}`
}


function addDays(
  dateString: string,
  days: number
) {
  const [
    year,
    month,
    day,
  ] =
    dateString
      .split('-')
      .map(Number)


  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day + days
      )
    )


  return [
    date.getUTCFullYear(),

    String(
      date.getUTCMonth() +
        1
    ).padStart(
      2,
      '0'
    ),

    String(
      date.getUTCDate()
    ).padStart(
      2,
      '0'
    ),
  ].join('-')
}


export default async function FinancePage({
  params,
}: Props) {
  const {
    projectId,
  } =
    await params


  const supabase =
    await createClient()


  const {
    data: project,
  } =
    await supabase
      .from(
        'projects'
      )
      .select(
        `
        id,
        name,
        timezone,
        base_currency
        `
      )
      .eq(
        'id',
        projectId
      )
      .maybeSingle()


  const timezone =
    project
      ?.timezone ??
    'America/Fortaleza'


  const currency =
    project
      ?.base_currency ??
    'BRL'


  const initialEndDate =
    formatDateInTimezone(
      new Date(),
      timezone
    )


  const initialStartDate =
    addDays(
      initialEndDate,
      -29
    )


  return (
    <main className="p-6 md:p-8">
      <div className="mx-auto max-w-[1700px]">

        <div>
          <p className="text-sm text-zinc-500">
            Performance financeira
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            Financeiro
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-zinc-600">
            Acompanhe receita aprovada, investimento e eficiência de mídia do projeto{' '}
            {project?.name ??
              'Traffic Flow'}.
          </p>

          <p className="mt-2 text-xs text-zinc-700">
            ROAS e CPA consideram somente vendas pagas atribuídas à Meta.
          </p>
        </div>


        <FinanceCenter
          projectId={
            projectId
          }

          currency={
            currency
          }

          initialStartDate={
            initialStartDate
          }

          initialEndDate={
            initialEndDate
          }
        />
      </div>
    </main>
  )
}