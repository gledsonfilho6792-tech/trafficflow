import type {
  SupabaseClient,
} from '@supabase/supabase-js'

import type {
  NormalizedOrder,
} from '@/lib/webhooks/types'


type AttributionMethod =
  | 'session_id'
  | 'token'


export type ResolvedAttribution = {
  trackingSessionId: string
  trackingSourceId: string

  sessionId: string
  visitorId: string

  attributionToken:
    string | null

  attributionMethod:
    AttributionMethod

  attributedAt: string

  utmSource:
    string | null

  utmMedium:
    string | null

  utmCampaign:
    string | null

  utmContent:
    string | null

  utmTerm:
    string | null

  fbclid:
    string | null
}


function isUuid(
  value:
    string | null | undefined
) {
  if (!value) {
    return false
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(value)
}


function getAttributionToken(
  order: NormalizedOrder
) {
  /*
   * Alguns checkouts permitem
   * transportar nossos parâmetros
   * diretamente.
   *
   * Outros, como a Applyfy,
   * preservam UTMs e utilizamos
   * utm_term como canal do token.
   */

  if (
    typeof order.utmTerm ===
      'string' &&
    order.utmTerm.startsWith(
      'tf_'
    )
  ) {
    return order.utmTerm
  }

  return null
}


async function findTrackingSession(
  admin: SupabaseClient,
  projectId: string,
  trackingSourceId: string,
  sessionId: string
) {
  const {
    data,
    error,
  } =
    await admin
      .from(
        'tracking_sessions'
      )
      .select(
        `
        id,
        tracking_source_id,
        session_id,
        visitor_id,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        fbclid
        `
      )
      .eq(
        'project_id',
        projectId
      )
      .eq(
        'tracking_source_id',
        trackingSourceId
      )
      .eq(
        'session_id',
        sessionId
      )
      .maybeSingle()


  if (error) {
    throw new Error(
      error.message
    )
  }


  return data
}


export async function resolveOrderAttribution({
  admin,
  projectId,
  order,
}: {
  admin: SupabaseClient
  projectId: string
  order: NormalizedOrder
}): Promise<
  ResolvedAttribution | null
> {

  /*
   * =====================================================
   * PRIORIDADE 1
   *
   * SESSION ID DIRETO
   * =====================================================
   *
   * Alguns checkouts poderão devolver
   * nosso session_id diretamente.
   */

  if (
    isUuid(
      order.sessionId
    )
  ) {
    const {
      data: session,
      error,
    } =
      await admin
        .from(
          'tracking_sessions'
        )
        .select(
          `
          id,
          tracking_source_id,
          session_id,
          visitor_id,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_content,
          utm_term,
          fbclid
          `
        )
        .eq(
          'project_id',
          projectId
        )
        .eq(
          'session_id',
          order.sessionId
        )
        .order(
          'started_at',
          {
            ascending:
              false,
          }
        )
        .limit(1)
        .maybeSingle()


    if (error) {
      throw new Error(
        error.message
      )
    }


    if (session) {
      return {
        trackingSessionId:
          session.id,

        trackingSourceId:
          session
            .tracking_source_id,

        sessionId:
          session.session_id,

        visitorId:
          session.visitor_id,

        attributionToken:
          null,

        attributionMethod:
          'session_id',

        attributedAt:
          new Date()
            .toISOString(),

        utmSource:
          session.utm_source,

        utmMedium:
          session.utm_medium,

        utmCampaign:
          session.utm_campaign,

        utmContent:
          session.utm_content,

        utmTerm:
          session.utm_term,

        fbclid:
          session.fbclid,
      }
    }
  }


  /*
   * =====================================================
   * PRIORIDADE 2
   *
   * ATTRIBUTION TOKEN
   * =====================================================
   */

  const attributionToken =
    getAttributionToken(
      order
    )


  if (!attributionToken) {
    return null
  }


  const {
    data: tokenRow,
    error: tokenError,
  } =
    await admin
      .from(
        'attribution_tokens'
      )
      .select(
        `
        id,
        project_id,
        tracking_source_id,
        session_id,
        visitor_id,
        token,
        expires_at
        `
      )
      .eq(
        'project_id',
        projectId
      )
      .eq(
        'token',
        attributionToken
      )
      .maybeSingle()


  if (tokenError) {
    throw new Error(
      tokenError.message
    )
  }


  if (!tokenRow) {
    return null
  }


  const session =
    await findTrackingSession(
      admin,
      projectId,
      tokenRow
        .tracking_source_id,
      tokenRow.session_id
    )


  if (!session) {
    return null
  }


  /*
   * Marca que o token realmente
   * foi utilizado por um pedido.
   */

  const {
    error:
      tokenUpdateError,
  } =
    await admin
      .from(
        'attribution_tokens'
      )
      .update({
        last_used_at:
          new Date()
            .toISOString(),
      })
      .eq(
        'id',
        tokenRow.id
      )


  if (tokenUpdateError) {
    console.error(
      'ATTRIBUTION TOKEN UPDATE ERROR:',
      tokenUpdateError
    )
  }


  return {
    trackingSessionId:
      session.id,

    trackingSourceId:
      session
        .tracking_source_id,

    sessionId:
      session.session_id,

    visitorId:
      session.visitor_id,

    attributionToken,

    attributionMethod:
      'token',

    attributedAt:
      new Date()
        .toISOString(),

    /*
     * Importante:
     *
     * recuperamos as UTMs ORIGINAIS
     * da tracking_session.
     *
     * Portanto o utm_term=tf_xxx
     * usado pela Applyfy deixa de ser
     * nosso valor final de utm_term.
     */

    utmSource:
      session.utm_source,

    utmMedium:
      session.utm_medium,

    utmCampaign:
      session.utm_campaign,

    utmContent:
      session.utm_content,

    utmTerm:
      session.utm_term,

    fbclid:
      session.fbclid,
  }
}