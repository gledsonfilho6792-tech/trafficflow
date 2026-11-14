import {
  NextRequest,
  NextResponse,
} from 'next/server'

import {
  createClient,
} from '@/lib/supabase/server'


export const dynamic =
  'force-dynamic'


const allowedCategories =
  new Set([
    'checkout_fee',
    'tax',
    'tool',
    'operational',
    'chargeback_fee',
    'refund_fee',
    'other',
  ])


function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(value)
}


function isDateOnly(
  value: string
) {
  return /^\d{4}-\d{2}-\d{2}$/
    .test(value)
}


/*
 * =========================================================
 * GET
 * Lista custos de um projeto
 * =========================================================
 */

export async function GET(
  request: NextRequest
) {
  try {
    const supabase =
      await createClient()


    const {
      data: {
        user,
      },

      error:
        userError,
    } =
      await supabase
        .auth
        .getUser()


    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Não autorizado.',
        },
        {
          status: 401,
        }
      )
    }


    const params =
      request.nextUrl
        .searchParams


    const projectId =
      params.get(
        'projectId'
      )


    const startDate =
      params.get(
        'startDate'
      )


    const endDate =
      params.get(
        'endDate'
      )


    if (
      !projectId ||
      !isUuid(
        projectId
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'projectId inválido.',
        },
        {
          status: 400,
        }
      )
    }


    /*
     * A consulta do projeto também confirma
     * que o usuário tem acesso através da RLS.
     */

    const {
      data: project,
      error:
        projectError,
    } =
      await supabase
        .from(
          'projects'
        )
        .select(
          'id'
        )
        .eq(
          'id',
          projectId
        )
        .maybeSingle()


    if (
      projectError ||
      !project
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Projeto não encontrado.',
        },
        {
          status: 404,
        }
      )
    }


    let query =
      supabase
        .from(
          'finance_expenses'
        )
        .select(
          `
          id,
          project_id,
          category,
          name,
          description,
          amount_brl,
          occurred_on,
          source,
          provider,
          external_ref,
          created_at,
          updated_at
          `
        )
        .eq(
          'project_id',
          projectId
        )
        .order(
          'occurred_on',
          {
            ascending: false,
          }
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        )


    if (
      startDate &&
      isDateOnly(
        startDate
      )
    ) {
      query =
        query.gte(
          'occurred_on',
          startDate
        )
    }


    if (
      endDate &&
      isDateOnly(
        endDate
      )
    ) {
      query =
        query.lte(
          'occurred_on',
          endDate
        )
    }


    const {
      data,
      error,
    } =
      await query


    if (error) {
      throw error
    }


    return NextResponse.json({
      ok: true,

      expenses:
        data ?? [],
    })
  } catch (error) {
    console.error(
      'FINANCE EXPENSES GET ERROR:',
      error
    )


    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : 'Erro ao carregar custos.',
      },
      {
        status: 500,
      }
    )
  }
}


/*
 * =========================================================
 * POST
 * Cadastra custo manual
 * =========================================================
 */

export async function POST(
  request: NextRequest
) {
  try {
    const supabase =
      await createClient()


    const {
      data: {
        user,
      },

      error:
        userError,
    } =
      await supabase
        .auth
        .getUser()


    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Não autorizado.',
        },
        {
          status: 401,
        }
      )
    }


    const body =
      await request.json()


    const projectId =
      String(
        body.projectId ??
        ''
      )


    const category =
      String(
        body.category ??
        ''
      )


    const name =
      String(
        body.name ??
        ''
      ).trim()


    const description =
      body.description
        ? String(
            body.description
          ).trim()
        : null


    const occurredOn =
      String(
        body.occurredOn ??
        ''
      )


    const amount =
      Number(
        body.amount
      )


    /*
     * =====================================================
     * VALIDAÇÃO
     * =====================================================
     */

    if (
      !isUuid(
        projectId
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Projeto inválido.',
        },
        {
          status: 400,
        }
      )
    }


    if (
      !allowedCategories.has(
        category
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Categoria inválida.',
        },
        {
          status: 400,
        }
      )
    }


    if (
      !name ||
      name.length >
        120
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Informe um nome válido.',
        },
        {
          status: 400,
        }
      )
    }


    if (
      !Number.isFinite(
        amount
      ) ||
      amount <=
        0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Informe um valor maior que zero.',
        },
        {
          status: 400,
        }
      )
    }


    if (
      !isDateOnly(
        occurredOn
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Data inválida.',
        },
        {
          status: 400,
        }
      )
    }


    /*
     * Confirma acesso ao projeto.
     */

    const {
      data: project,
      error:
        projectError,
    } =
      await supabase
        .from(
          'projects'
        )
        .select(
          'id'
        )
        .eq(
          'id',
          projectId
        )
        .maybeSingle()


    if (
      projectError ||
      !project
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Projeto não encontrado.',
        },
        {
          status: 404,
        }
      )
    }


    /*
     * =====================================================
     * INSERT
     * =====================================================
     */

    const {
      data,
      error,
    } =
      await supabase
        .from(
          'finance_expenses'
        )
        .insert({
          project_id:
            projectId,

          category,

          name,

          description,

          amount_brl:
            amount,

          occurred_on:
            occurredOn,

          source:
            'manual',
        })
        .select(
          `
          id,
          project_id,
          category,
          name,
          description,
          amount_brl,
          occurred_on,
          source,
          created_at
          `
        )
        .single()


    if (error) {
      throw error
    }


    return NextResponse.json(
      {
        ok: true,

        expense:
          data,
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(
      'FINANCE EXPENSES POST ERROR:',
      error
    )


    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : 'Erro ao cadastrar custo.',
      },
      {
        status: 500,
      }
    )
  }
}