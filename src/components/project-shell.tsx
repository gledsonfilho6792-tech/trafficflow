'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  BadgeDollarSign,
  Blocks,
  ChartNoAxesCombined,
  ChevronDown,
  CircleDollarSign,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  Waypoints,
} from 'lucide-react'

type ProjectShellProps = {
  children: React.ReactNode
  project: {
    id: string
    name: string
  }
}

export default function ProjectShell({
  children,
  project,
}: ProjectShellProps) {
  const pathname = usePathname()

  const navigation = [
    {
      label: 'Visão geral',
      href: `/project/${project.id}/dashboard`,
      icon: LayoutDashboard,
    },
    {
      label: 'Campanhas',
      href: `/project/${project.id}/campaigns`,
      icon: ChartNoAxesCombined,
    },
    {
      label: 'Vendas',
      href: `/project/${project.id}/sales`,
      icon: ShoppingCart,
    },
    {
      label: 'Tracking',
      href: `/project/${project.id}/tracking`,
      icon: Waypoints,
    },
    {
      label: 'Integrações',
      href: `/project/${project.id}/integrations`,
      icon: Blocks,
    },
    {
      label: 'Financeiro',
      href: `/project/${project.id}/finance`,
      icon: CircleDollarSign,
    },
    {
      label: 'Configurações',
      href: `/project/${project.id}/settings`,
      icon: Settings,
    },
  ]

  return (
    <div className="min-h-screen bg-[#08090c] text-white">
      {/* SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-white/[0.06] bg-[#0b0d10] lg:flex lg:flex-col">
        {/* LOGO */}
        <div className="flex h-20 items-center border-b border-white/[0.06] px-6">
          <Link
            href="/projects"
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-black">
              <BarChart3 size={20} strokeWidth={2.5} />
            </div>

            <div>
              <p className="text-[15px] font-semibold tracking-tight">
                Traffic Flow
              </p>

              <p className="text-[11px] text-zinc-600">
                Performance Intelligence
              </p>
            </div>
          </Link>
        </div>

        {/* PROJETO */}
        <div className="px-4 py-5">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
            Projeto
          </p>

          <Link
            href="/projects"
            className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-3 transition hover:bg-white/[0.05]"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-200">
                {project.name}
              </p>

              <p className="mt-0.5 text-[11px] text-zinc-600">
                Trocar projeto
              </p>
            </div>

            <ChevronDown
              size={15}
              className="shrink-0 text-zinc-600"
            />
          </Link>
        </div>

        {/* MENU */}
        <nav className="flex-1 px-4">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
            Workspace
          </p>

          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon

              const active =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    active
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'text-zinc-500 hover:bg-white/[0.035] hover:text-zinc-200'
                  }`}
                >
                  <Icon size={18} strokeWidth={1.8} />

                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* RODAPÉ SIDEBAR */}
        <div className="border-t border-white/[0.06] p-4">
          <div className="rounded-xl bg-white/[0.025] p-3">
            <div className="flex items-center gap-2">
              <BadgeDollarSign
                size={16}
                className="text-emerald-400"
              />

              <span className="text-xs font-medium text-zinc-300">
                Traffic Flow
              </span>
            </div>

            <p className="mt-2 text-[11px] leading-4 text-zinc-600">
              Tracking, atribuição e performance em uma única plataforma.
            </p>
          </div>
        </div>
      </aside>

      {/* CONTEÚDO */}
      <div className="lg:pl-[260px]">
        {/* TOPBAR */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-white/[0.06] bg-[#08090c]/90 px-6 backdrop-blur-xl md:px-8">
          <div>
            <p className="text-xs text-zinc-600">
              Projeto atual
            </p>

            <p className="mt-1 text-sm font-medium text-zinc-200">
              {project.name}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-white/[0.06] bg-white/[0.025] px-3 py-1.5 text-xs text-zinc-500 sm:block">
              Ambiente de produção
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-zinc-900 text-xs font-semibold text-zinc-300">
              TF
            </div>
          </div>
        </header>

        {/* PÁGINAS */}
        <div className="min-h-[calc(100vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  )
}