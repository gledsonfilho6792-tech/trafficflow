import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProjectShell from '@/components/project-shell'

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
    .select('id, name')
    .eq('id', projectId)
    .single()

  if (error || !project) {
    notFound()
  }

  return (
    <ProjectShell project={project}>
      {children}
    </ProjectShell>
  )
}