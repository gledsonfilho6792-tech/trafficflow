import {
  createAdminClient,
} from '@/lib/supabase/admin'

import {
  backfillMetaTrackingAttribution,
} from '@/lib/meta/backfill-tracking-attribution'


type MetaPagingResponse<T> = {
  data?: T[]

  paging?: {
    next?: string
  }

  error?: {
    message?: string
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


type SyncMetaStructureParams = {
  projectId: string

  adAccountId: string
  adAccountExternalId: string

  accessToken: string
}


async function fetchAllMetaPages<T>(
  initialUrl: string,
  accessToken: string
): Promise<T[]> {
  const results: T[] = []

  let nextUrl:
    string | null =
    initialUrl


  while (nextUrl) {
    const response =
      await fetch(
        nextUrl,
        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },

          cache:
            'no-store',
        }
      )


    const data:
      MetaPagingResponse<T> =
      await response.json()


    if (
      !response.ok ||
      data.error
    ) {
      throw new Error(
        data.error?.message ||
          'Erro ao consultar a Meta API.'
      )
    }


    if (data.data) {
      results.push(
        ...data.data
      )
    }


    nextUrl =
      data.paging?.next ??
      null
  }


  return results
}


export async function syncMetaStructure({
  projectId,
  adAccountId,
  adAccountExternalId,
  accessToken,
}: SyncMetaStructureParams) {
  const admin =
    createAdminClient()


  const apiVersion =
    process.env
      .META_API_VERSION ||
    'v26.0'


  const graphBase =
    `https://graph.facebook.com/${apiVersion}`


  /*
   * =====================================================
   * CAMPAIGNS
   * =====================================================
   */

  const campaignsUrl =
    new URL(
      `${graphBase}/${adAccountExternalId}/campaigns`
    )


  campaignsUrl
    .searchParams
    .set(
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


  campaignsUrl
    .searchParams
    .set(
      'limit',
      '100'
    )


  const metaCampaigns =
    await fetchAllMetaPages<MetaCampaign>(
      campaignsUrl
        .toString(),

      accessToken
    )


  if (
    metaCampaigns.length >
    0
  ) {
    const campaignRows =
      metaCampaigns.map(
        (campaign) => ({
          project_id:
            projectId,

          ad_account_id:
            adAccountId,

          external_id:
            campaign.id,

          name:
            campaign.name,

          status:
            campaign.status ??
            null,

          effective_status:
            campaign
              .effective_status ??
            null,

          objective:
            campaign.objective ??
            null,

          buying_type:
            campaign
              .buying_type ??
            null,

          start_time:
            campaign.start_time ??
            null,

          stop_time:
            campaign.stop_time ??
            null,

          created_time_meta:
            campaign
              .created_time ??
            null,

          updated_time_meta:
            campaign
              .updated_time ??
            null,

          raw_data:
            campaign,
        })
      )


    const {
      error,
    } =
      await admin
        .from(
          'campaigns'
        )
        .upsert(
          campaignRows,
          {
            onConflict:
              'ad_account_id,external_id',
          }
        )


    if (error) {
      throw new Error(
        `Campanhas: ${error.message}`
      )
    }
  }


  /*
   * =====================================================
   * MAPA CAMPAIGN
   *
   * Meta external_id
   *      ↓
   * UUID Traffic Flow
   * =====================================================
   */

  const {
    data:
      localCampaigns,

    error:
      localCampaignError,
  } =
    await admin
      .from(
        'campaigns'
      )
      .select(
        'id, external_id'
      )
      .eq(
        'ad_account_id',
        adAccountId
      )


  if (
    localCampaignError ||
    !localCampaigns
  ) {
    throw new Error(
      localCampaignError
        ?.message ||
        'Erro ao mapear campanhas.'
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
   * AD SETS
   * =====================================================
   */

  const adSetsUrl =
    new URL(
      `${graphBase}/${adAccountExternalId}/adsets`
    )


  adSetsUrl
    .searchParams
    .set(
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


  adSetsUrl
    .searchParams
    .set(
      'limit',
      '100'
    )


  const metaAdSets =
    await fetchAllMetaPages<MetaAdSet>(
      adSetsUrl
        .toString(),

      accessToken
    )


  const adSetRows =
    metaAdSets
      .map(
        (adSet) => {
          const campaignId =
            campaignMap.get(
              adSet
                .campaign_id
            )


          if (!campaignId) {
            return null
          }


          return {
            project_id:
              projectId,

            ad_account_id:
              adAccountId,

            campaign_id:
              campaignId,

            external_id:
              adSet.id,

            name:
              adSet.name,

            status:
              adSet.status ??
              null,

            effective_status:
              adSet
                .effective_status ??
              null,

            optimization_goal:
              adSet
                .optimization_goal ??
              null,

            billing_event:
              adSet
                .billing_event ??
              null,

            start_time:
              adSet
                .start_time ??
              null,

            end_time:
              adSet
                .end_time ??
              null,

            created_time_meta:
              adSet
                .created_time ??
              null,

            updated_time_meta:
              adSet
                .updated_time ??
              null,

            raw_data:
              adSet,
          }
        }
      )
      .filter(
        (
          row
        ): row is NonNullable<
          typeof row
        > =>
          Boolean(row)
      )


  if (
    adSetRows.length >
    0
  ) {
    const {
      error,
    } =
      await admin
        .from(
          'ad_sets'
        )
        .upsert(
          adSetRows,
          {
            onConflict:
              'ad_account_id,external_id',
          }
        )


    if (error) {
      throw new Error(
        `Conjuntos: ${error.message}`
      )
    }
  }


  /*
   * =====================================================
   * MAPA AD SET
   *
   * Meta external_id
   *      ↓
   * UUID Traffic Flow
   * =====================================================
   */

  const {
    data:
      localAdSets,

    error:
      localAdSetError,
  } =
    await admin
      .from(
        'ad_sets'
      )
      .select(
        'id, external_id'
      )
      .eq(
        'ad_account_id',
        adAccountId
      )


  if (
    localAdSetError ||
    !localAdSets
  ) {
    throw new Error(
      localAdSetError
        ?.message ||
        'Erro ao mapear conjuntos.'
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
   * ADS
   * =====================================================
   */

  const adsUrl =
    new URL(
      `${graphBase}/${adAccountExternalId}/ads`
    )


  adsUrl
    .searchParams
    .set(
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


  adsUrl
    .searchParams
    .set(
      'limit',
      '100'
    )


  const metaAds =
    await fetchAllMetaPages<MetaAd>(
      adsUrl
        .toString(),

      accessToken
    )


  const adRows =
    metaAds
      .map(
        (ad) => {
          const campaignId =
            campaignMap.get(
              ad.campaign_id
            )


          const adSetId =
            adSetMap.get(
              ad.adset_id
            )


          if (
            !campaignId ||
            !adSetId
          ) {
            return null
          }


          return {
            project_id:
              projectId,

            ad_account_id:
              adAccountId,

            campaign_id:
              campaignId,

            ad_set_id:
              adSetId,

            external_id:
              ad.id,

            creative_external_id:
              ad.creative?.id ??
              null,

            name:
              ad.name,

            status:
              ad.status ??
              null,

            effective_status:
              ad
                .effective_status ??
              null,

            created_time_meta:
              ad.created_time ??
              null,

            updated_time_meta:
              ad.updated_time ??
              null,

            raw_data:
              ad,
          }
        }
      )
      .filter(
        (
          row
        ): row is NonNullable<
          typeof row
        > =>
          Boolean(row)
      )


  if (
    adRows.length >
    0
  ) {
    const {
      error,
    } =
      await admin
        .from(
          'ads'
        )
        .upsert(
          adRows,
          {
            onConflict:
              'ad_account_id,external_id',
          }
        )


    if (error) {
      throw new Error(
        `Anúncios: ${error.message}`
      )
    }
  }


  /*
   * =====================================================
   * BACKFILL DA ATRIBUIÇÃO
   * =====================================================
   *
   * Agora que campaigns, ad_sets e ads
   * foram sincronizados, resolvemos
   * automaticamente sessões que chegaram
   * antes dessas entidades existirem
   * localmente.
   *
   * Exemplo:
   *
   * clique chega
   * tf_ad_id = 123
   *
   * ads ainda não possui 123
   * → external_id fica salvo
   *
   * sync roda
   * → anúncio 123 chega
   *
   * backfill:
   * → ad_id
   * → ad_set_id
   * → campaign_id
   *
   * preenchidos automaticamente.
   * =====================================================
   */

  const backfill =
    await backfillMetaTrackingAttribution(
      projectId
    )


  /*
   * =====================================================
   * RESULTADO
   * =====================================================
   */

  return {
    campaigns:
      metaCampaigns.length,

    adSets:
      adSetRows.length,

    ads:
      adRows.length,

    total:
      metaCampaigns.length +
      adSetRows.length +
      adRows.length,

    attributionBackfill: {
      updatedAds:
        backfill.updatedAds,

      updatedAdSets:
        backfill.updatedAdSets,

      updatedCampaigns:
        backfill
          .updatedCampaigns,

      total:
        backfill.updatedAds +
        backfill.updatedAdSets +
        backfill.updatedCampaigns,
    },
  }
}