import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen bg-[#08090c] p-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <p className="text-sm font-medium text-emerald-400">
            TRAFFIC FLOW
          </p>

          <h1 className="mt-2 text-3xl font-semibold">
            Dashboard
          </h1>
     <div className="mb-8">
  <Link
    href="/projects"
    className="inline-flex rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400"
  >
    Gerenciar projetos
  </Link>
</div>
          <p className="mt-2 text-sm text-zinc-500">
            Sessão autenticada com sucesso.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Faturamento" value="R$ 0,00" />
          <MetricCard title="Investimento" value="R$ 0,00" />
          <MetricCard title="ROAS" value="0,00" />
          <MetricCard title="Vendas" value="0" />
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-[#0e1014] p-6">
          <p className="text-sm text-zinc-500">
            Usuário autenticado
          </p>

          <p className="mt-1 text-sm text-zinc-300">
            {user?.email}
          </p>
        </div>
      </div>
    </main>
  )
}

function MetricCard({
  title,
  value,
}: {
  title: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0e1014] p-6">
      <p className="text-sm text-zinc-500">
        {title}
      </p>

      <p className="mt-3 text-2xl font-semibold">
        {value}
      </p>
    </div>
  )
}