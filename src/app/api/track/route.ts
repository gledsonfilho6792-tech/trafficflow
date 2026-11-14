import {
  NextRequest,
  NextResponse,
} from 'next/server'

import {
  createAdminClient,
} from '@/lib/supabase/admin'


export const dynamic =
  'force-dynamic'


const ALLOWED_EVENTS = [
  'page_view',
  'initiate_checkout',
  'lead',
] as const


type AllowedEvent =
  (typeof ALLOWED_EVENTS)[number]


type TrackPayload = {
  sourceKey?: unknown

  eventName?: unknown

  visitorId?: unknown
  sessionId?: unknown

  pageUrl?: unknown
  referrer?: unknown

  utmSource?: unknown
  utmMedium?: unknown
  utmCampaign?: unknown
  utmContent?: unknown
  utmTerm?: unknown

  fbclid?: unknown
  fbp?: unknown
  fbc?: unknown

  gclid?: unknown
  ttclid?: unknown

  /*
   * Meta Ads
   */
  metaCampaignId?: unknown
  metaAdSetId?: unknown
  metaAdId?: unknown
  metaPlacement?: unknown
  metaSiteSource?: unknown

  metadata?: unknown
}


function getString(
  value: unknown
): string | null {
  return typeof value ===
      'string' &&
    value.trim().length > 0
    ? value.trim()
    : null
}


function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(value)
}


function isAllowedEvent(
  value: string
): value is AllowedEvent {
  return (
    ALLOWED_EVENTS as readonly string[]
  ).includes(value)
}


function asMetadata(
  value: unknown
): Record<string, unknown> {
  if (
    !value ||
    typeof value !==
      'object' ||
    Array.isArray(value)
  ) {
    return {}
  }

  return value as Record<
    string,
    unknown
  >
}


function getQueryParam(
  pageUrl: string | null,
  name: string
): string | null {
  if (!pageUrl) {
    return null
  }

  try {
    return (
      new URL(pageUrl)
        .searchParams
        .get(name)
    )
  } catch {
    return null
  }
}


function normalizeHostname(
  value: string
): string | null {
  try {
    const url =
      value.includes('://')
        ? new URL(value)
        : new URL(
            `https://${value}`
          )

    return url.hostname
      .toLowerCase()
      .replace(
        /^www\./,
        ''
      )
  } catch {
    return null
  }
}


function originMatchesDomain(
  origin: string | null,
  configuredDomain:
    string | null
) {
  if (!configuredDomain) {
    return true
  }

  if (!origin) {
    return true
  }

  const originHost =
    normalizeHostname(
      origin
    )

  const allowedHost =
    normalizeHostname(
      configuredDomain
    )


  if (
    !originHost ||
    !allowedHost
  ) {
    return false
  }


  return (
    originHost ===
      allowedHost ||
    originHost.endsWith(
      `.${allowedHost}`
    )
  )
}


function corsHeaders(
  origin: string | null
) {
  return {
    'Access-Control-Allow-Origin':
      origin ?? '*',

    'Access-Control-Allow-Methods':
      'POST, OPTIONS',

    'Access-Control-Allow-Headers':
      'Content-Type',

    'Access-Control-Max-Age':
      '86400',

    Vary:
      'Origin',
  }
}


export async function OPTIONS(
  request: NextRequest
) {
  const origin =
    request.headers.get(
      'origin'
    )

  return new NextResponse(
    null,
    {
      status: 204,

      headers:
        corsHeaders(
          origin
        ),
    }
  )
}


export async function POST(
  request: NextRequest
) {
  const origin =
    request.headers.get(
      'origin'
    )

  const headers =
    corsHeaders(
      origin
    )


  try {
    /*
     * =====================================================
     * PAYLOAD
     * =====================================================
     */

    const contentLength =
      Number(
        request.headers.get(
          'content-length'
        ) ?? 0
      )


    if (
      contentLength >
      250_000
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Payload muito grande.',
        },
        {
          status: 413,
          headers,
        }
      )
    }


    let body:
      TrackPayload


    try {
      body =
        await request.json()
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error:
            'JSON inválido.',
        },
        {
          status: 400,
          headers,
        }
      )
    }


    const sourceKey =
      getString(
        body.sourceKey
      )

    const eventName =
      getString(
        body.eventName
      )

    const visitorId =
      getString(
        body.visitorId
      )

    const sessionId =
      getString(
        body.sessionId
      )


    /*
     * =====================================================
     * VALIDAÇÃO
     * =====================================================
     */

    if (
      !sourceKey ||
      !isUuid(sourceKey)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'sourceKey inválida.',
        },
        {
          status: 400,
          headers,
        }
      )
    }


    if (
      !eventName ||
      !isAllowedEvent(
        eventName
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Evento não suportado.',
        },
        {
          status: 400,
          headers,
        }
      )
    }


    if (
      !visitorId ||
      !isUuid(visitorId)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'visitorId inválido.',
        },
        {
          status: 400,
          headers,
        }
      )
    }


    if (
      !sessionId ||
      !isUuid(sessionId)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'sessionId inválido.',
        },
        {
          status: 400,
          headers,
        }
      )
    }


    const admin =
      createAdminClient()


    /*
     * =====================================================
     * TRACKING SOURCE
     * =====================================================
     */

    const {
      data: source,
      error: sourceError,
    } =
      await admin
        .from(
          'tracking_sources'
        )
        .select(
          `
          id,
          project_id,
          domain,
          is_active
          `
        )
        .eq(
          'public_key',
          sourceKey
        )
        .eq(
          'is_active',
          true
        )
        .maybeSingle()


    if (
      sourceError ||
      !source
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Fonte de tracking não encontrada.',
        },
        {
          status: 404,
          headers,
        }
      )
    }


    if (
      !originMatchesDomain(
        origin,
        source.domain
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Origem não autorizada.',
        },
        {
          status: 403,
          headers,
        }
      )
    }


    /*
     * =====================================================
     * URL / REFERRER
     * =====================================================
     */

    const pageUrl =
      getString(
        body.pageUrl
      )

    const referrer =
      getString(
        body.referrer
      )


    /*
     * =====================================================
     * UTMs
     * =====================================================
     */

    const utmSource =
      getString(
        body.utmSource
      ) ??
      getQueryParam(
        pageUrl,
        'utm_source'
      )


    const utmMedium =
      getString(
        body.utmMedium
      ) ??
      getQueryParam(
        pageUrl,
        'utm_medium'
      )


    const utmCampaign =
      getString(
        body.utmCampaign
      ) ??
      getQueryParam(
        pageUrl,
        'utm_campaign'
      )


    const utmContent =
      getString(
        body.utmContent
      ) ??
      getQueryParam(
        pageUrl,
        'utm_content'
      )


    const utmTerm =
      getString(
        body.utmTerm
      ) ??
      getQueryParam(
        pageUrl,
        'utm_term'
      )


    /*
     * =====================================================
     * CLICK IDS
     * =====================================================
     */

    const fbclid =
      getString(
        body.fbclid
      ) ??
      getQueryParam(
        pageUrl,
        'fbclid'
      )


    const fbp =
      getString(
        body.fbp
      )


    const fbc =
      getString(
        body.fbc
      )


    const gclid =
      getString(
        body.gclid
      ) ??
      getQueryParam(
        pageUrl,
        'gclid'
      )


    const ttclid =
      getString(
        body.ttclid
      ) ??
      getQueryParam(
        pageUrl,
        'ttclid'
      )


    /*
     * =====================================================
     * META ADS
     * =====================================================
     *
     * Esses parâmetros chegam à
     * landing page através da URL
     * do anúncio da Meta.
     *
     * Não precisamos levá-los
     * até o checkout.
     *
     * A sessão já os preserva.
     * =====================================================
     */

    const metaCampaignExternalId =
      getString(
        body.metaCampaignId
      ) ??
      getQueryParam(
        pageUrl,
        'tf_campaign_id'
      )


    const metaAdSetExternalId =
      getString(
        body.metaAdSetId
      ) ??
      getQueryParam(
        pageUrl,
        'tf_adset_id'
      )


    const metaAdExternalId =
      getString(
        body.metaAdId
      ) ??
      getQueryParam(
        pageUrl,
        'tf_ad_id'
      )


    const metaPlacement =
      getString(
        body.metaPlacement
      ) ??
      getQueryParam(
        pageUrl,
        'tf_placement'
      )


    const metaSiteSource =
      getString(
        body.metaSiteSource
      ) ??
      getQueryParam(
        pageUrl,
        'tf_site_source'
      )


    /*
     * =====================================================
     * RESOLVER ENTIDADES META
     * =====================================================
     *
     * Além de guardar os IDs externos,
     * tentamos relacioná-los imediatamente
     * às tabelas já sincronizadas:
     *
     * campaigns
     * ad_sets
     * ads
     *
     * Se a estrutura Meta estiver alguns
     * minutos atrasada, não perdemos nada:
     * os IDs externos continuam salvos.
     * =====================================================
     */

    let campaignId:
      string | null =
      null

    let adSetId:
      string | null =
      null

    let adId:
      string | null =
      null


    /*
     * AD é o melhor ponto de resolução,
     * pois já conhece campanha e conjunto.
     */

    if (
      metaAdExternalId
    ) {
      const {
        data: metaAd,
        error: metaAdError,
      } =
        await admin
          .from('ads')
          .select(
            `
            id,
            campaign_id,
            ad_set_id
            `
          )
          .eq(
            'project_id',
            source.project_id
          )
          .eq(
            'external_id',
            metaAdExternalId
          )
          .maybeSingle()


      if (metaAdError) {
        throw new Error(
          metaAdError.message
        )
      }


      if (metaAd) {
        adId =
          metaAd.id

        adSetId =
          metaAd.ad_set_id

        campaignId =
          metaAd.campaign_id
      }
    }


    /*
     * Caso o anúncio ainda não esteja
     * sincronizado, tentamos o conjunto.
     */

    if (
      !adSetId &&
      metaAdSetExternalId
    ) {
      const {
        data: metaAdSet,
        error:
          metaAdSetError,
      } =
        await admin
          .from(
            'ad_sets'
          )
          .select(
            `
            id,
            campaign_id
            `
          )
          .eq(
            'project_id',
            source.project_id
          )
          .eq(
            'external_id',
            metaAdSetExternalId
          )
          .maybeSingle()


      if (metaAdSetError) {
        throw new Error(
          metaAdSetError.message
        )
      }


      if (metaAdSet) {
        adSetId =
          metaAdSet.id

        campaignId =
          metaAdSet
            .campaign_id
      }
    }


    /*
     * Último fallback:
     * campanha.
     */

    if (
      !campaignId &&
      metaCampaignExternalId
    ) {
      const {
        data: metaCampaign,
        error:
          metaCampaignError,
      } =
        await admin
          .from(
            'campaigns'
          )
          .select('id')
          .eq(
            'project_id',
            source.project_id
          )
          .eq(
            'external_id',
            metaCampaignExternalId
          )
          .maybeSingle()


      if (
        metaCampaignError
      ) {
        throw new Error(
          metaCampaignError
            .message
        )
      }


      if (metaCampaign) {
        campaignId =
          metaCampaign.id
      }
    }


    /*
     * =====================================================
     * DADOS DO NAVEGADOR
     * =====================================================
     */

    const userAgent =
      request.headers.get(
        'user-agent'
      )


    const country =
      request.headers.get(
        'x-vercel-ip-country'
      )


    const region =
      request.headers.get(
        'x-vercel-ip-country-region'
      )


    const city =
      request.headers.get(
        'x-vercel-ip-city'
      )


    /*
     * =====================================================
     * SESSÃO EXISTENTE?
     * =====================================================
     */

    const {
      data:
        existingSession,

      error:
        existingSessionError,
    } =
      await admin
        .from(
          'tracking_sessions'
        )
        .select('id')
        .eq(
          'tracking_source_id',
          source.id
        )
        .eq(
          'session_id',
          sessionId
        )
        .maybeSingle()


    if (
      existingSessionError
    ) {
      throw new Error(
        existingSessionError
          .message
      )
    }


    let trackingSessionId:
      string


    /*
     * =====================================================
     * NOVA SESSÃO
     * =====================================================
     */

    if (!existingSession) {
      const {
        data:
          newSession,

        error:
          newSessionError,
      } =
        await admin
          .from(
            'tracking_sessions'
          )
          .insert({
            project_id:
              source.project_id,

            tracking_source_id:
              source.id,

            visitor_id:
              visitorId,

            session_id:
              sessionId,

            landing_url:
              pageUrl,

            referrer,

            user_agent:
              userAgent,

            country,
            region,
            city,

            utm_source:
              utmSource,

            utm_medium:
              utmMedium,

            utm_campaign:
              utmCampaign,

            utm_content:
              utmContent,

            utm_term:
              utmTerm,

            fbclid,

            fbp,
            fbc,

            gclid,
            ttclid,


            /*
             * Meta external IDs
             */

            meta_campaign_external_id:
              metaCampaignExternalId,

            meta_ad_set_external_id:
              metaAdSetExternalId,

            meta_ad_external_id:
              metaAdExternalId,

            meta_placement:
              metaPlacement,

            meta_site_source:
              metaSiteSource,


            /*
             * Meta entities resolvidas
             */

            campaign_id:
              campaignId,

            ad_set_id:
              adSetId,

            ad_id:
              adId,
          })
          .select('id')
          .single()


      if (
        newSessionError ||
        !newSession
      ) {
        throw new Error(
          newSessionError
            ?.message ??
          'Erro ao criar sessão.'
        )
      }


      trackingSessionId =
        newSession.id
    }


    /*
     * =====================================================
     * ATUALIZAR SESSÃO
     * =====================================================
     */

    else {
      trackingSessionId =
        existingSession.id


      const updateData:
        Record<
          string,
          unknown
        > = {
        last_seen_at:
          new Date()
            .toISOString(),
      }


      /*
       * Nunca substituímos valores
       * de marketing por NULL.
       */

      if (utmSource) {
        updateData
          .utm_source =
          utmSource
      }


      if (utmMedium) {
        updateData
          .utm_medium =
          utmMedium
      }


      if (utmCampaign) {
        updateData
          .utm_campaign =
          utmCampaign
      }


      if (utmContent) {
        updateData
          .utm_content =
          utmContent
      }


      if (utmTerm) {
        updateData
          .utm_term =
          utmTerm
      }


      if (fbclid) {
        updateData.fbclid =
          fbclid
      }


      if (fbp) {
        updateData.fbp =
          fbp
      }


      if (fbc) {
        updateData.fbc =
          fbc
      }


      if (gclid) {
        updateData.gclid =
          gclid
      }


      if (ttclid) {
        updateData.ttclid =
          ttclid
      }


      /*
       * ===================================================
       * META
       * ===================================================
       *
       * Se recebemos um novo external ID,
       * atualizamos também a resolução.
       *
       * Aqui NULL é intencionalmente
       * permitido no ID interno:
       *
       * pode existir um novo anúncio que
       * ainda não chegou no sync da Meta.
       *
       * Não queremos manter uma relação
       * antiga incorreta nesse cenário.
       */

      if (
        metaCampaignExternalId
      ) {
        updateData
          .meta_campaign_external_id =
          metaCampaignExternalId

        updateData
          .campaign_id =
          campaignId
      }


      if (
        metaAdSetExternalId
      ) {
        updateData
          .meta_ad_set_external_id =
          metaAdSetExternalId

        updateData
          .ad_set_id =
          adSetId
      }


      if (
        metaAdExternalId
      ) {
        updateData
          .meta_ad_external_id =
          metaAdExternalId

        updateData
          .ad_id =
          adId


        /*
         * Quando o anúncio foi resolvido,
         * ele também determina conjunto
         * e campanha.
         */

        if (adId) {
          updateData
            .ad_set_id =
            adSetId

          updateData
            .campaign_id =
            campaignId
        }
      }


      if (
        metaPlacement
      ) {
        updateData
          .meta_placement =
          metaPlacement
      }


      if (
        metaSiteSource
      ) {
        updateData
          .meta_site_source =
          metaSiteSource
      }


      const {
        error:
          sessionUpdateError,
      } =
        await admin
          .from(
            'tracking_sessions'
          )
          .update(
            updateData
          )
          .eq(
            'id',
            trackingSessionId
          )


      if (
        sessionUpdateError
      ) {
        throw new Error(
          sessionUpdateError
            .message
        )
      }
    }


    /*
     * =====================================================
     * EVENTO
     * =====================================================
     */

    const {
      data: event,
      error: eventError,
    } =
      await admin
        .from(
          'tracking_events'
        )
        .insert({
          project_id:
            source.project_id,

          tracking_source_id:
            source.id,

          tracking_session_id:
            trackingSessionId,

          visitor_id:
            visitorId,

          session_id:
            sessionId,

          event_name:
            eventName,

          page_url:
            pageUrl,

          referrer,

          metadata:
            asMetadata(
              body.metadata
            ),
        })
        .select(
          `
          id,
          event_id,
          occurred_at
          `
        )
        .single()


    if (
      eventError ||
      !event
    ) {
      throw new Error(
        eventError
          ?.message ??
        'Erro ao salvar evento.'
      )
    }


    /*
     * =====================================================
     * RESPOSTA
     * =====================================================
     */

    return NextResponse.json(
      {
        ok: true,

        eventId:
          event.event_id,

        sessionId,
        visitorId,

        trackingSessionId,

        traffic: {
          meta: {
            campaignExternalId:
              metaCampaignExternalId,

            adSetExternalId:
              metaAdSetExternalId,

            adExternalId:
              metaAdExternalId,

            placement:
              metaPlacement,

            siteSource:
              metaSiteSource,

            campaignId,

            adSetId,

            adId,
          },
        },

        occurredAt:
          event.occurred_at,
      },
      {
        status: 200,
        headers,
      }
    )
  } catch (error) {
    console.error(
      'TRACK ERROR:',
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
        headers,
      }
    )
  }
}