'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { deferEffect } from '@/lib/defer-effect'
import { createClient } from '@/lib/supabase/client'

type Project = {
  id: string
  name: string
  slug: string
  timezone: string
  base_currency: string
  status: string
  created_at: string
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const [supabase] = useState(createClient)

  const loadProjects = useCallback(async () => {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError('Não foi possível carregar os projetos.')
      console.error(error)
      setLoading(false)
      return
    }

    setProjects(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => deferEffect(() => { void loadProjects() }), [loadProjects])

  function createSlug(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  async function handleCreateProject(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (!name.trim()) return

    setCreating(true)
    setError('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setError('Sua sessão não foi encontrada. Faça login novamente.')
      setCreating(false)
      return
    }

    const slug = createSlug(name)

    const { data, error } = await supabase
      .from('projects')
      .insert({
        owner_id: user.id,
        name: name.trim(),
        slug,
        timezone: 'America/Fortaleza',
        base_currency: 'BRL',
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      console.error(error)

      if (error.code === '23505') {
        setError('Você já possui um projeto com esse nome.')
      } else {
        setError('Não foi possível criar o projeto.')
      }

      setCreating(false)
      return
    }

    setProjects((current) => [data, ...current])
    setName('')
    setCreating(false)
  }

  return (
    <main className="min-h-screen bg-[#08090c] p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-400">
              TRAFFIC FLOW
            </p>

            <h1 className="mt-2 text-3xl font-semibold">
              Projetos
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Gerencie suas operações, produtos e ofertas.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900"
          >
            Voltar
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          <section className="h-fit rounded-2xl border border-zinc-800 bg-[#0e1014] p-6">
            <h2 className="text-lg font-semibold">
              Novo projeto
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Cada produto ou operação pode ter suas próprias integrações e métricas.
            </p>

            <form
              onSubmit={handleCreateProject}
              className="mt-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Nome do projeto
                </label>

                <input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ex.: Futsal Infantil"
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-[#090b0e] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-500"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? 'Criando...' : 'Criar projeto'}
              </button>
            </form>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Seus projetos
              </h2>

              <span className="text-sm text-zinc-500">
                {projects.length}{' '}
                {projects.length === 1 ? 'projeto' : 'projetos'}
              </span>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-zinc-800 bg-[#0e1014] p-8 text-sm text-zinc-500">
                Carregando projetos...
              </div>
            ) : projects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#0e1014] p-10 text-center">
                <p className="font-medium text-zinc-300">
                  Nenhum projeto criado.
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  Crie seu primeiro projeto usando o formulário ao lado.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {projects.map((project) => (
                  <Link
                      key={project.id}
                      href={`/project/${project.id}/dashboard`}
                      className="block rounded-2xl border border-zinc-800 bg-[#0e1014] p-6 transition hover:border-emerald-500/50 hover:bg-[#111318]"
                    >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {project.name}
                        </h3>

                        <p className="mt-1 text-xs text-zinc-600">
                          {project.slug}
                        </p>
                      </div>

                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                        Ativo
                      </span>
                    </div>

                    <div className="mt-6 border-t border-zinc-800 pt-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">
                          Moeda
                        </span>

                        <span className="text-zinc-300">
                          {project.base_currency}
                        </span>
                      </div>

                      <div className="mt-3 flex justify-between text-sm">
                        <span className="text-zinc-500">
                          Fuso horário
                        </span>

                        <span className="text-zinc-300">
                          {project.timezone}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}