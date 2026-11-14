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
 * PATCH
 * Edita um custo manual
 * =========================================================
 */

export async function PATCH(
  request: NextRequest,
  context: {
    params:
      Promise<{
        expenseId: string
      }>
  }
) {
  try {
    const {
      expenseId,
    } =
      await context.params


    if (
      !isUuid(
        expenseId
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Custo inválido.',
        },
        {
          status: 400,
        }
      )
    }


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
     * =====================================================
     * LOCALIZAR CUSTO
     * =====================================================
     *
     * A RLS garante que o usuário só enxerga
     * despesas dos próprios projetos.
     * =====================================================
     */

    const {
      data:
        existingExpense,

      error:
        existingError,
    } =
      await supabase
        .from(
          'finance_expenses'
        )
        .select(
          `
          id,
          project_id,
          source
          `
        )
        .eq(
          'id',
          expenseId
        )
        .eq(
          'project_id',
          projectId
        )
        .maybeSingle()


    if (
      existingError
    ) {
      throw existingError
    }


    if (
      !existingExpense
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Custo não encontrado.',
        },
        {
          status: 404,
        }
      )
    }


    /*
     * Neste momento somente lançamentos
     * manuais podem ser editados.
     *
     * Custos automáticos de checkout/provider
     * serão protegidos contra edição manual.
     */

    if (
      existingExpense.source !==
      'manual'
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Este custo é automático e não pode ser editado manualmente.',
        },
        {
          status: 409,
        }
      )
    }


    /*
     * =====================================================
     * UPDATE
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
        .update({
          category,

          name,

          description,

          amount_brl:
            amount,

          occurred_on:
            occurredOn,
        })
        .eq(
          'id',
          expenseId
        )
        .eq(
          'project_id',
          projectId
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
        .single()


    if (error) {
      throw error
    }


    return NextResponse.json({
      ok: true,

      expense:
        data,
    })
  } catch (error) {
    console.error(
      'FINANCE EXPENSE PATCH ERROR:',
      error
    )


    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : 'Erro ao editar custo.',
      },
      {
        status: 500,
      }
    )
  }
}


/*
 * =========================================================
 * DELETE
 * Exclui um custo manual
 * =========================================================
 */

export async function DELETE(
  request: NextRequest,
  context: {
    params:
      Promise<{
        expenseId: string
      }>
  }
) {
  try {
    const {
      expenseId,
    } =
      await context.params


    if (
      !isUuid(
        expenseId
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Custo inválido.',
        },
        {
          status: 400,
        }
      )
    }


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


    const projectId =
      request.nextUrl
        .searchParams
        .get(
          'projectId'
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
            'Projeto inválido.',
        },
        {
          status: 400,
        }
      )
    }


    /*
     * =====================================================
     * LOCALIZAR CUSTO
     * =====================================================
     */

    const {
      data:
        existingExpense,

      error:
        existingError,
    } =
      await supabase
        .from(
          'finance_expenses'
        )
        .select(
          `
          id,
          project_id,
          source
          `
        )
        .eq(
          'id',
          expenseId
        )
        .eq(
          'project_id',
          projectId
        )
        .maybeSingle()


    if (
      existingError
    ) {
      throw existingError
    }


    if (
      !existingExpense
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Custo não encontrado.',
        },
        {
          status: 404,
        }
      )
    }


    /*
     * Custos automáticos não devem ser apagados
     * manualmente porque poderão ser recriados
     * por webhook ou sincronização.
     */

    if (
      existingExpense.source !==
      'manual'
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Este custo é automático e não pode ser excluído manualmente.',
        },
        {
          status: 409,
        }
      )
    }


    /*
     * =====================================================
     * DELETE
     * =====================================================
     */

    const {
      error,
    } =
      await supabase
        .from(
          'finance_expenses'
        )
        .delete()
        .eq(
          'id',
          expenseId
        )
        .eq(
          'project_id',
          projectId
        )


    if (error) {
      throw error
    }


    return NextResponse.json({
      ok: true,

      deletedId:
        expenseId,
    })
  } catch (error) {
    console.error(
      'FINANCE EXPENSE DELETE ERROR:',
      error
    )


    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : 'Erro ao excluir custo.',
      },
      {
        status: 500,
      }
    )
  }
}