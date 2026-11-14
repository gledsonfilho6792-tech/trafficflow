import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProjectSettingsForm from '@/components/project-settings-form'

export default async function SettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()
  const { data: project, error } = await supabase.from('projects')
    .select('id, name, slug, timezone, base_currency')
    .eq('id', projectId).eq('owner_id', user.id).maybeSingle()
  if (error || !project) notFound()
  return (
    <main className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-white">Configurações</h1>
      <p className="mt-2 text-sm text-zinc-400">Dados e preferências do projeto.</p>
      <ProjectSettingsForm project={project} />
    </main>
  )
}
