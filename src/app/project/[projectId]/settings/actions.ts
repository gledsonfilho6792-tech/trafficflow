'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateProjectSettings(
  projectId: string,
  _previous: { error?: string; success?: string },
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const name = String(formData.get('name') ?? '').trim()
  const timezone = String(formData.get('timezone') ?? '').trim()

  if (!name || name.length > 120) {
    return { error: 'Informe um nome com até 120 caracteres.' }
  }
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: timezone }).format()
  } catch {
    return { error: 'Informe um fuso horário válido, como America/Fortaleza.' }
  }
  if (!timezone) return { error: 'Informe o fuso horário do projeto.' }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sua sessão expirou. Entre novamente.' }

  const { data, error } = await supabase.from('projects')
    .update({ name, timezone })
    .eq('id', projectId).eq('owner_id', user.id)
    .select('id').maybeSingle()

  if (error || !data) return { error: 'Não foi possível salvar as configurações.' }

  revalidatePath(`/project/${projectId}`, 'layout')
  revalidatePath('/projects')
  return { success: 'Configurações salvas.' }
}
