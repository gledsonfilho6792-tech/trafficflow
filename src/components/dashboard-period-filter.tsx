'use client'

import {
  useRouter,
  usePathname,
} from 'next/navigation'

type Props = {
  startDate: string
  endDate: string
}

type Preset =
  | 'today'
  | 'yesterday'
  | '7days'
  | '14days'
  | '30days'

function formatLocalDate(
  date: Date
) {
  const year =
    date.getFullYear()

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, '0')

  const day =
    String(
      date.getDate()
    ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getPresetPeriod(
  preset: Preset
) {
  const today =
    new Date()

  const end =
    new Date(today)

  const start =
    new Date(today)

  if (preset === 'yesterday') {
    start.setDate(
      start.getDate() - 1
    )

    end.setDate(
      end.getDate() - 1
    )
  }

  if (preset === '7days') {
    start.setDate(
      start.getDate() - 6
    )
  }

  if (preset === '14days') {
    start.setDate(
      start.getDate() - 13
    )
  }

  if (preset === '30days') {
    start.setDate(
      start.getDate() - 29
    )
  }

  return {
    startDate:
      formatLocalDate(start),

    endDate:
      formatLocalDate(end),
  }
}

export default function DashboardPeriodFilter({
  startDate,
  endDate,
}: Props) {
  const router =
    useRouter()

  const pathname =
    usePathname()

  function applyPeriod(
    start: string,
    end: string
  ) {
    const params =
      new URLSearchParams()

    params.set(
      'startDate',
      start
    )

    params.set(
      'endDate',
      end
    )

    router.push(
      `${pathname}?${params.toString()}`
    )
  }

  function applyPreset(
    preset: Preset
  ) {
    const period =
      getPresetPeriod(
        preset
      )

    applyPeriod(
      period.startDate,
      period.endDate
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* PRESETS */}

      <div className="flex flex-wrap gap-2">
        <PresetButton
          label="Hoje"
          onClick={() =>
            applyPreset(
              'today'
            )
          }
        />

        <PresetButton
          label="Ontem"
          onClick={() =>
            applyPreset(
              'yesterday'
            )
          }
        />

        <PresetButton
          label="7 dias"
          onClick={() =>
            applyPreset(
              '7days'
            )
          }
        />

        <PresetButton
          label="14 dias"
          onClick={() =>
            applyPreset(
              '14days'
            )
          }
        />

        <PresetButton
          label="30 dias"
          onClick={() =>
            applyPreset(
              '30days'
            )
          }
        />
      </div>

      {/* PERSONALIZADO */}

      <form
        action={pathname}
        className="flex flex-wrap items-end gap-3"
      >
        <label>
          <span className="mb-2 block text-xs text-zinc-500">
            Data inicial
          </span>

          <input
            type="date"
            name="startDate"
            defaultValue={
              startDate
            }
            className="rounded-xl border border-white/[0.06] bg-[#0d0f13] px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-emerald-500/40"
          />
        </label>

        <label>
          <span className="mb-2 block text-xs text-zinc-500">
            Data final
          </span>

          <input
            type="date"
            name="endDate"
            defaultValue={
              endDate
            }
            className="rounded-xl border border-white/[0.06] bg-[#0d0f13] px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-emerald-500/40"
          />
        </label>

        <button
          type="submit"
          className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400"
        >
          Aplicar
        </button>
      </form>
    </div>
  )
}

function PresetButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs font-medium text-zinc-400 transition hover:border-emerald-500/30 hover:bg-emerald-500/[0.06] hover:text-emerald-300"
    >
      {label}
    </button>
  )
}