import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import WorkspaceClient from '@/components/workspace/client'
export default async function Page({params}:{params:Promise<{projectId:string}>}){
 const {projectId}=await params;const db=await createClient();const {data:project}=await db.from('projects').select('timezone').eq('id',projectId).maybeSingle();if(!project)notFound();
 return <Suspense fallback={<div className="tf-loading">Carregando…</div>}><WorkspaceClient projectId={projectId} timezone={project.timezone} mode="settings"/></Suspense>
}
