import {
  NextRequest,
  NextResponse,
} from 'next/server'

import {
  createClient,
} from '@/lib/supabase/server'

import {
  createAdminClient,
} from '@/lib/supabase/admin'


export const dynamic =
  'force-dynamic'


function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(value)
}


export async function GET(
  request: NextRequest
) {
  try {
    const projectId =
      request.nextUrl
        .searchParams
        .get('projectId')


    if (
      !projectId ||
      !isUuid(projectId)
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
     * =====================================================
     * AUTENTICAÇÃO
     * =====================================================
     */

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


    const {
      data: project,

      error:
        projectError,
    } =
      await supabase
        .from('projects')
        .select(
          `
          id,
          name
          `
        )
        .eq(
          'id',
          projectId
        )
        .eq(
          'owner_id',
          user.id
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


    const admin =
      createAdminClient()


    /*
     * =====================================================
     * FONTE DE TRACKING
     * =====================================================
     */

    const {
      data: source,

      error:
        sourceError,
    } =
      await admin
        .from(
          'tracking_sources'
        )
        .select(
          `
          id,
          name,
          public_key,
          domain,
          is_active
          `
        )
        .eq(
          'project_id',
          projectId
        )
        .eq(
          'is_active',
          true
        )
        .order(
          'created_at',
          {
            ascending:
              true,
          }
        )
        .limit(1)
        .maybeSingle()


    if (
      sourceError
    ) {
      throw new Error(
        sourceError.message
      )
    }


    if (!source) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'Nenhuma fonte de tracking ativa.',
        },
        {
          status: 404,
        }
      )
    }


    /*
     * =====================================================
     * ANÚNCIO META REAL
     * =====================================================
     *
     * Pegamos uma entidade real já
     * sincronizada no banco.
     * =====================================================
     */

    const {
      data: ad,

      error:
        adError,
    } =
      await admin
        .from('ads')
        .select(
          `
          id,
          external_id,
          name,
          campaign_id,
          ad_set_id,
          updated_at
          `
        )
        .eq(
          'project_id',
          projectId
        )
        .not(
          'campaign_id',
          'is',
          null
        )
        .not(
          'ad_set_id',
          'is',
          null
        )
        .order(
          'updated_at',
          {
            ascending:
              false,
          }
        )
        .limit(1)
        .maybeSingle()


    if (
      adError
    ) {
      throw new Error(
        adError.message
      )
    }


    if (
      !ad ||
      !ad.campaign_id ||
      !ad.ad_set_id
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'Nenhum anúncio Meta completo foi encontrado.',
        },
        {
          status: 404,
        }
      )
    }


    /*
     * =====================================================
     * CAMPANHA + CONJUNTO
     * =====================================================
     */

    const [
      campaignResult,
      adSetResult,
    ] =
      await Promise.all([
        admin
          .from(
            'campaigns'
          )
          .select(
            `
            id,
            external_id,
            name
            `
          )
          .eq(
            'id',
            ad.campaign_id
          )
          .maybeSingle(),

        admin
          .from(
            'ad_sets'
          )
          .select(
            `
            id,
            external_id,
            name
            `
          )
          .eq(
            'id',
            ad.ad_set_id
          )
          .maybeSingle(),
      ])


    if (
      campaignResult.error
    ) {
      throw new Error(
        campaignResult
          .error
          .message
      )
    }


    if (
      adSetResult.error
    ) {
      throw new Error(
        adSetResult
          .error
          .message
      )
    }


    const campaign =
      campaignResult.data


    const adSet =
      adSetResult.data


    if (
      !campaign ||
      !adSet
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'Não foi possível resolver campanha e conjunto.',
        },
        {
          status: 500,
        }
      )
    }


    /*
     * =====================================================
     * URL DO TESTE
     * =====================================================
     *
     * Usamos a aplicação LOCAL.
     * Não é a PV real.
     * =====================================================
     */

    const testUrl =
      new URL(
        '/tracking-e2e.html',
        request.nextUrl.origin
      )


    testUrl.searchParams.set(
      'source_key',
      source.public_key
    )


    testUrl.searchParams.set(
      'utm_source',
      'traffic_flow_test'
    )


    testUrl.searchParams.set(
      'utm_medium',
      'diagnostic'
    )


    testUrl.searchParams.set(
      'utm_campaign',
      campaign.name
    )


    testUrl.searchParams.set(
      'utm_content',
      ad.name
    )


    testUrl.searchParams.set(
      'utm_term',
      adSet.name
    )


    testUrl.searchParams.set(
      'tf_campaign_id',
      campaign.external_id
    )


    testUrl.searchParams.set(
      'tf_adset_id',
      adSet.external_id
    )


    testUrl.searchParams.set(
      'tf_ad_id',
      ad.external_id
    )


    testUrl.searchParams.set(
      'tf_placement',
      'feed'
    )


    testUrl.searchParams.set(
      'tf_site_source',
      'facebook'
    )


    return NextResponse.json({
      ok: true,

      source: {
        id:
          source.id,

        name:
          source.name,

        domain:
          source.domain,

        publicKey:
          source.public_key,
      },

      meta: {
        campaign: {
          id:
            campaign.id,

          externalId:
            campaign.external_id,

          name:
            campaign.name,
        },

        adSet: {
          id:
            adSet.id,

          externalId:
            adSet.external_id,

          name:
            adSet.name,
        },

        ad: {
          id:
            ad.id,

          externalId:
            ad.external_id,

          name:
            ad.name,
        },
      },

      testUrl:
        testUrl.toString(),
    })
  } catch (error) {
    console.error(
      'TRACKING E2E CONTEXT ERROR:',
      error
    )


    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : 'Erro inesperado.',
      },
      {
        status: 500,
      }
    )
  }
}