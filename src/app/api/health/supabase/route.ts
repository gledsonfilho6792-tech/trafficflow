import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Variáveis do Supabase não encontradas.',
        },
        { status: 500 }
      )
    }

    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: {
        apikey: supabaseKey,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Não foi possível conectar ao Supabase.',
          status: response.status,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: 'Traffic Flow conectado ao Supabase com sucesso.',
    })
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: 'Erro ao testar conexão com Supabase.',
      },
      { status: 500 }
    )
  }
}