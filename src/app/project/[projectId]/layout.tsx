import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProjectShell from '@/components/project-shell'
import { object } from '@/lib/workspace/types'

type Props = {
  children: React.ReactNode

  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectLayout({
  children,
  params,
}: Props) {
  const { projectId } = await params

  const supabase = await createClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, timezone, base_currency')
    .eq('id', projectId)
    .single()

  if (error || !project) {
    notFound()
  }

  const { data: projects } = await supabase.from('projects').select('id,name,timezone,base_currency').order('name')

  const {data: preferenceRow} = await supabase.from('user_project_preferences').select('preferences').eq('project_id',projectId).maybeSingle()
  return (
    <ProjectShell key={project.id} project={project} projects={projects || []} preferences={object(preferenceRow?.preferences)}>
      {children}
    </ProjectShell>
  )
}