'use client'

import { useActionState } from 'react'
import { updateProjectSettings } from '@/app/project/[projectId]/settings/actions'

type Project = {
  id: string
  name: string
  timezone: string
  base_currency: string
  slug: string
}

export default function ProjectSettingsForm({ project }: { project: Project }) {
  const [state, action, pending] = useActionState(
    updateProjectSettings.bind(null, project.id),
    {} as { error?: string; success?: string }
  )
  const inputClass = 'mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500'

  return (
    <form action={action} className="mt-6 max-w-2xl space-y-5 rounded-2xl border border-white/10 bg-[#0d0f13] p-6">
      <div>
        <label htmlFor="project-name" className="text-sm text-zinc-300">Nome do projeto</label>
        <input id="project-name" name="name" defaultValue={project.name} required maxLength={120} className={inputClass} />
      </div>
      <div>
        <label htmlFor="project-timezone" className="text-sm text-zinc-300">Fuso horário</label>
        <input id="project-timezone" name="timezone" defaultValue={project.timezone} required list="project-timezones" aria-describedby="timezone-help" className={inputClass} />
        <datalist id="project-timezones">
          {['America/Fortaleza', 'America/Sao_Paulo', 'America/Manaus', 'America/Bogota', 'Europe/Lisbon', 'Europe/Madrid', 'UTC'].map(zone => <option key={zone} value={zone} />)}
        </datalist>
        <p id="timezone-help" className="mt-2 text-xs text-zinc-400">Define os limites dos dias nos relatórios. Alterações podem mudar o agrupamento das métricas por data.</p>
      </div>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div><dt className="text-zinc-400">Moeda base</dt><dd className="mt-1 text-white">{project.base_currency}</dd></div>
        <div><dt className="text-zinc-400">Identificador</dt><dd className="mt-1 break-all text-white">{project.slug}</dd></div>
      </dl>
      <p className="text-xs text-zinc-400">A moeda base acompanha os dados financeiros existentes. Sua alteração exige uma migração dos valores históricos.</p>
      <div role="status" aria-live="polite">
        {state.error && <p className="text-sm text-red-400">{state.error}</p>}
        {state.success && <p className="text-sm text-emerald-400">{state.success}</p>}
      </div>
      <button disabled={pending} className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-50">{pending ? 'Salvando…' : 'Salvar configurações'}</button>
    </form>
  )
}
