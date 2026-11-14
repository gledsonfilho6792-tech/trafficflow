import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type MetaPagingResponse<T> = {
  data?: T[]
  paging?: {
    next?: string
  }
  error?: {
    message?: string
    type?: string
    code?: number
  }
}

type MetaCampaign = {
  id: string
  name: string
  status?: string
  effective_status?: string
  objective?: string
  buying_type?: string
  start_time?: string
  stop_time?: string
  created_time?: string
  updated_time?: string
}

type MetaAdSet = {
  id: string
  name: string
  campaign_id: string
  status?: string
  effective_status?: string
  optimization_goal?: string
  billing_event?: string
  start_time?: string
  end_time?: string
  created_time?: string
  updated_time?: string
}

type MetaAd = {
  id: string
  name: string
  campaign_id: string
  adset_id: string
  status?: string
  effective_status?: string
  created_time?: string
  updated_time?: string
  creative?: {
    id?: string
  }
}

async function fetchAllMetaPages<T>(
  initialUrl: string,
  accessToken: string
): Promise<T[]> {
  const results: T[] = []

  let nextUrl: string | null = initialUrl

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    })

    const data: MetaPagingResponse<T> =
      await response.json()

    if (!response.ok || data.error) {
      throw new Error(
        data.error?.message ||
          'Erro ao consultar a Meta API.'
      )
    }

    if (data.data) {
      results.push(...data.data)
    }

    nextUrl = data.paging?.next ?? null
  }

  return results
}

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json()

    const projectId =
      body?.projectId as string | undefined

    if (!projectId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'projectId não informado.',
        },
        {
          status: 400,
        }
      )
    }

    /*
     * Cliente normal:
     * usado para validar o usuário.
     */
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Usuário não autenticado.',
        },
        {
          status: 401,
        }
      )
    }

    /*
     * Confirma que o projeto pertence
     * ao usuário autenticado.
     */
    const {
      data: project,
      error: projectError,
    } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('owner_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Projeto não encontrado.',
        },
        {
          status: 404,
        }
      )
    }

    /*
     * Cliente administrativo:
     * usado somente no servidor.
     */
    const admin =
      createAdminClient()

    /*
     * Busca integração Meta.
     */
    const {
      data: integration,
      error: integrationError,
    } = await admin
      .from('integrations')
      .select(
        'id, status, external_account_id'
      )
      .eq('project_id', projectId)
      .eq('provider', 'meta')
      .eq('integration_type', 'ads')
      .single()

    if (
      integrationError ||
      !integration
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Integração Meta não encontrada.',
        },
        {
          status: 404,
        }
      )
    }

    if (
      integration.status !== 'connected'
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'A integração Meta ainda não está conectada.',
        },
        {
          status: 400,
        }
      )
    }

    /*
     * Busca conta de anúncios ativa.
     */
    const {
      data: adAccount,
      error: adAccountError,
    } = await admin
      .from('ad_accounts')
      .select(
        `
        id,
        external_id,
        account_id,
        name,
        currency,
        timezone_name
        `
      )
      .eq('project_id', projectId)
      .eq('integration_id', integration.id)
      .eq('provider', 'meta')
      .eq('is_active', true)
      .single()

    if (
      adAccountError ||
      !adAccount
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Nenhuma conta Meta ativa foi encontrada.',
        },
        {
          status: 404,
        }
      )
    }

    /*
     * Recupera token criptografado
     * armazenado no Vault.
     */
    const {
      data: accessToken,
      error: secretError,
    } = await admin.rpc(
      'get_integration_secret',
      {
        p_integration_id:
          integration.id,
      }
    )

    if (
      secretError ||
      !accessToken
    ) {
      console.error(
        'META TOKEN READ ERROR:',
        secretError
      )

      return NextResponse.json(
        {
          ok: false,
          error:
            'Não foi possível recuperar a credencial da Meta.',
        },
        {
          status: 500,
        }
      )
    }

    const apiVersion =
      process.env.META_API_VERSION ||
      'v26.0'

    const graphBase =
      `https://graph.facebook.com/${apiVersion}`

    /*
     * =====================================================
     * 1. CAMPAIGNS
     * =====================================================
     */

    const campaignsUrl =
      new URL(
        `${graphBase}/${adAccount.external_id}/campaigns`
      )

    campaignsUrl.searchParams.set(
      'fields',
      [
        'id',
        'name',
        'status',
        'effective_status',
        'objective',
        'buying_type',
        'start_time',
        'stop_time',
        'created_time',
        'updated_time',
      ].join(',')
    )

    campaignsUrl.searchParams.set(
      'limit',
      '100'
    )

    const metaCampaigns =
      await fetchAllMetaPages<MetaCampaign>(
        campaignsUrl.toString(),
        accessToken
      )

    if (metaCampaigns.length > 0) {
      const campaignRows =
        metaCampaigns.map(
          (campaign) => ({
            project_id: projectId,

            ad_account_id:
              adAccount.id,

            external_id:
              campaign.id,

            name:
              campaign.name,

            status:
              campaign.status ?? null,

            effective_status:
              campaign.effective_status ??
              null,

            objective:
              campaign.objective ?? null,

            buying_type:
              campaign.buying_type ?? null,

            start_time:
              campaign.start_time ?? null,

            stop_time:
              campaign.stop_time ?? null,

            created_time_meta:
              campaign.created_time ??
              null,

            updated_time_meta:
              campaign.updated_time ??
              null,

            raw_data:
              campaign,
          })
        )

      const {
        error: campaignUpsertError,
      } = await admin
        .from('campaigns')
        .upsert(
          campaignRows,
          {
            onConflict:
              'ad_account_id,external_id',
          }
        )

      if (campaignUpsertError) {
        console.error(
          'CAMPAIGN UPSERT ERROR:',
          campaignUpsertError
        )

        return NextResponse.json(
          {
            ok: false,
            error:
              'Erro ao salvar campanhas.',
            details:
              campaignUpsertError.message,
          },
          {
            status: 500,
          }
        )
      }
    }

    /*
     * Busca campanhas locais para
     * montar mapa:
     *
     * external Meta ID -> UUID interno
     */
    const {
      data: localCampaigns,
      error:
        localCampaignsError,
    } = await admin
      .from('campaigns')
      .select('id, external_id')
      .eq(
        'ad_account_id',
        adAccount.id
      )

    if (
      localCampaignsError ||
      !localCampaigns
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Erro ao mapear campanhas locais.',
        },
        {
          status: 500,
        }
      )
    }

    const campaignMap =
      new Map(
        localCampaigns.map(
          (campaign) => [
            campaign.external_id,
            campaign.id,
          ]
        )
      )

    /*
     * =====================================================
     * 2. AD SETS
     * =====================================================
     */

    const adSetsUrl =
      new URL(
        `${graphBase}/${adAccount.external_id}/adsets`
      )

    adSetsUrl.searchParams.set(
      'fields',
      [
        'id',
        'name',
        'campaign_id',
        'status',
        'effective_status',
        'optimization_goal',
        'billing_event',
        'start_time',
        'end_time',
        'created_time',
        'updated_time',
      ].join(',')
    )

    adSetsUrl.searchParams.set(
      'limit',
      '100'
    )

    const metaAdSets =
      await fetchAllMetaPages<MetaAdSet>(
        adSetsUrl.toString(),
        accessToken
      )

    const adSetRows =
      metaAdSets
        .map((adSet) => {
          const localCampaignId =
            campaignMap.get(
              adSet.campaign_id
            )

          if (!localCampaignId) {
            return null
          }

          return {
            project_id: projectId,

            ad_account_id:
              adAccount.id,

            campaign_id:
              localCampaignId,

            external_id:
              adSet.id,

            name:
              adSet.name,

            status:
              adSet.status ?? null,

            effective_status:
              adSet.effective_status ??
              null,

            optimization_goal:
              adSet.optimization_goal ??
              null,

            billing_event:
              adSet.billing_event ??
              null,

            start_time:
              adSet.start_time ?? null,

            end_time:
              adSet.end_time ?? null,

            created_time_meta:
              adSet.created_time ??
              null,

            updated_time_meta:
              adSet.updated_time ??
              null,

            raw_data:
              adSet,
          }
        })
        .filter(
          (
            row
          ): row is NonNullable<
            typeof row
          > => Boolean(row)
        )

    if (adSetRows.length > 0) {
      const {
        error: adSetUpsertError,
      } = await admin
        .from('ad_sets')
        .upsert(
          adSetRows,
          {
            onConflict:
              'ad_account_id,external_id',
          }
        )

      if (adSetUpsertError) {
        console.error(
          'AD SET UPSERT ERROR:',
          adSetUpsertError
        )

        return NextResponse.json(
          {
            ok: false,
            error:
              'Erro ao salvar conjuntos.',
            details:
              adSetUpsertError.message,
          },
          {
            status: 500,
          }
        )
      }
    }

    /*
     * Mapa de Ad Sets locais.
     */
    const {
      data: localAdSets,
      error: localAdSetsError,
    } = await admin
      .from('ad_sets')
      .select('id, external_id')
      .eq(
        'ad_account_id',
        adAccount.id
      )

    if (
      localAdSetsError ||
      !localAdSets
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Erro ao mapear conjuntos locais.',
        },
        {
          status: 500,
        }
      )
    }

    const adSetMap =
      new Map(
        localAdSets.map(
          (adSet) => [
            adSet.external_id,
            adSet.id,
          ]
        )
      )

    /*
     * =====================================================
     * 3. ADS
     * =====================================================
     */

    const adsUrl =
      new URL(
        `${graphBase}/${adAccount.external_id}/ads`
      )

    adsUrl.searchParams.set(
      'fields',
      [
        'id',
        'name',
        'campaign_id',
        'adset_id',
        'status',
        'effective_status',
        'creative{id}',
        'created_time',
        'updated_time',
      ].join(',')
    )

    adsUrl.searchParams.set(
      'limit',
      '100'
    )

    const metaAds =
      await fetchAllMetaPages<MetaAd>(
        adsUrl.toString(),
        accessToken
      )

    const adRows =
      metaAds
        .map((ad) => {
          const localCampaignId =
            campaignMap.get(
              ad.campaign_id
            )

          const localAdSetId =
            adSetMap.get(
              ad.adset_id
            )

          if (
            !localCampaignId ||
            !localAdSetId
          ) {
            return null
          }

          return {
            project_id: projectId,

            ad_account_id:
              adAccount.id,

            campaign_id:
              localCampaignId,

            ad_set_id:
              localAdSetId,

            external_id:
              ad.id,

            creative_external_id:
              ad.creative?.id ??
              null,

            name:
              ad.name,

            status:
              ad.status ?? null,

            effective_status:
              ad.effective_status ??
              null,

            created_time_meta:
              ad.created_time ?? null,

            updated_time_meta:
              ad.updated_time ?? null,

            raw_data:
              ad,
          }
        })
        .filter(
          (
            row
          ): row is NonNullable<
            typeof row
          > => Boolean(row)
        )

    if (adRows.length > 0) {
      const {
        error: adsUpsertError,
      } = await admin
        .from('ads')
        .upsert(
          adRows,
          {
            onConflict:
              'ad_account_id,external_id',
          }
        )

      if (adsUpsertError) {
        console.error(
          'ADS UPSERT ERROR:',
          adsUpsertError
        )

        return NextResponse.json(
          {
            ok: false,
            error:
              'Erro ao salvar anúncios.',
            details:
              adsUpsertError.message,
          },
          {
            status: 500,
          }
        )
      }
    }

    /*
     * Marca horário do último sync.
     */
    await admin
      .from('integrations')
      .update({
        last_synced_at:
          new Date().toISOString(),
      })
      .eq(
        'id',
        integration.id
      )

    return NextResponse.json({
      ok: true,

      account: {
        id:
          adAccount.external_id,

        name:
          adAccount.name,
      },

      imported: {
        campaigns:
          metaCampaigns.length,

        adSets:
          adSetRows.length,

        ads:
          adRows.length,
      },
    })
  } catch (error) {
    console.error(
      'META SYNC ERROR:',
      error
    )

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : 'Erro inesperado durante a sincronização.',
      },
      {
        status: 500,
      }
    )
  }
}