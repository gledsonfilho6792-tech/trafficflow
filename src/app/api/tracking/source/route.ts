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


const SUPPORTED_EVENTS = [
  'page_view',
  'initiate_checkout',
  'lead',
]


function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(value)
}


function getString(
  value: unknown
) {
  if (
    typeof value !==
      'string'
  ) {
    return null
  }


  const trimmed =
    value.trim()


  return trimmed
    ? trimmed
    : null
}


function normalizeDomain(
  value:
    | string
    | null
) {
  if (!value) {
    return null
  }


  try {
    const url =
      value.includes('://')
        ? new URL(value)
        : new URL(
            `https://${value}`
          )


    const hostname =
      url.hostname
        .toLowerCase()
        .replace(
          /^www\./,
          ''
        )


    return hostname ||
      null
  } catch {
    return null
  }
}


function hostnameFromUrl(
  value:
    | string
    | null
) {
  if (!value) {
    return null
  }


  try {
    return new URL(
      value
    )
      .hostname
      .toLowerCase()
      .replace(
        /^www\./,
        ''
      )
  } catch {
    return null
  }
}


function pageMatchesDomain(
  pageUrl:
    | string
    | null,
  domain:
    | string
    | null
) {
  if (
    !pageUrl ||
    !domain
  ) {
    return false
  }


  const pageHost =
    hostnameFromUrl(
      pageUrl
    )


  const allowedHost =
    normalizeDomain(
      domain
    )


  if (
    !pageHost ||
    !allowedHost
  ) {
    return false
  }


  return (
    pageHost ===
      allowedHost ||
    pageHost.endsWith(
      `.${allowedHost}`
    )
  )
}


function ageInMinutes(
  value:
    | string
    | null
) {
  if (!value) {
    return null
  }


  const timestamp =
    new Date(
      value
    ).getTime()


  if (
    !Number.isFinite(
      timestamp
    )
  ) {
    return null
  }


  return Math.max(
    0,
    Math.floor(
      (
        Date.now() -
        timestamp
      ) /
        60000
    )
  )
}


async function getAuthorizedProject(
  projectId: string
) {
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
    return {
      error:
        'Não autorizado.',
      status:
        401,
      project:
        null,
    }
  }


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
    return {
      error:
        'Projeto não encontrado.',
      status:
        404,
      project:
        null,
    }
  }


  return {
    error: null,
    status: 200,
    project,
  }
}


function getPublicBaseUrl(
  request: NextRequest
) {
  return (
    process.env
      .TRAFFIC_FLOW_PUBLIC_URL ||
    request.nextUrl.origin
  ).replace(
    /\/+$/,
    ''
  )
}


function getEnvironment(
  publicBaseUrl: string
) {
  try {
    const hostname =
      new URL(
        publicBaseUrl
      ).hostname


    if (
      hostname ===
        'localhost' ||
      hostname ===
        '127.0.0.1'
    ) {
      return 'development'
    }


    return 'production'
  } catch {
    return 'production'
  }
}


async function buildSourceResponse(
  request: NextRequest,
  projectId: string,
  projectName: string
) {
  const admin =
    createAdminClient()


  const {
    data: sources,

    error:
      sourcesError,
  } =
    await admin
      .from(
        'tracking_sources'
      )
      .select(
        `
        id,
        project_id,
        name,
        domain,
        public_key,
        is_active,
        created_at,
        updated_at
        `
      )
      .eq(
        'project_id',
        projectId
      )
      .order(
        'created_at',
        {
          ascending:
            true,
        }
      )


  if (
    sourcesError
  ) {
    throw new Error(
      sourcesError.message
    )
  }


  const source =
    sources?.[0] ??
    null


  const publicBaseUrl =
    getPublicBaseUrl(
      request
    )


  const environment =
    getEnvironment(
      publicBaseUrl
    )


  if (!source) {
    return {
      ok: true,

      project: {
        id:
          projectId,

        name:
          projectName,
      },

      source:
        null,

      installation: {
        status:
          'not_configured',

        environment,

        publicBaseUrl,

        scriptUrl:
          `${publicBaseUrl}/traffic-flow.js`,

        script:
          null,

        supportedEvents:
          SUPPORTED_EVENTS,

        lastDetectedAt:
          null,

        lastDetectedPageUrl:
          null,

        lastDetectedMinutes:
          null,
      },
    }
  }


  /*
   * =====================================================
   * DETECÇÃO DE INSTALAÇÃO
   * =====================================================
   *
   * Buscamos page views recentes
   * dessa fonte.
   *
   * A instalação só é considerada
   * detectada se a URL realmente
   * pertencer ao domínio configurado.
   *
   * Assim os nossos testes antigos
   * em localhost não validam
   * acidentalmente a PV de produção.
   * =====================================================
   */

  const {
    data:
      recentPageViews,

    error:
      pageViewsError,
  } =
    await admin
      .from(
        'tracking_events'
      )
      .select(
        `
        occurred_at,
        page_url
        `
      )
      .eq(
        'project_id',
        projectId
      )
      .eq(
        'tracking_source_id',
        source.id
      )
      .eq(
        'event_name',
        'page_view'
      )
      .order(
        'occurred_at',
        {
          ascending:
            false,
        }
      )
      .limit(50)


  if (
    pageViewsError
  ) {
    throw new Error(
      pageViewsError.message
    )
  }


  const matchingPageView =
    (
      recentPageViews ??
      []
    ).find(
      (
        event
      ) =>
        pageMatchesDomain(
          event.page_url,
          source.domain
        )
    ) ??
    null


  const detectedMinutes =
    ageInMinutes(
      matchingPageView
        ?.occurred_at ??
      null
    )


  let installationStatus:
    | 'disabled'
    | 'domain_missing'
    | 'waiting'
    | 'detected'
    | 'stale'


  if (
    !source.is_active
  ) {
    installationStatus =
      'disabled'
  } else if (
    !source.domain
  ) {
    installationStatus =
      'domain_missing'
  } else if (
    !matchingPageView
  ) {
    installationStatus =
      'waiting'
  } else if (
    detectedMinutes !==
      null &&
    detectedMinutes <=
      1440
  ) {
    installationStatus =
      'detected'
  } else {
    installationStatus =
      'stale'
  }


  const script =
    `<script src="${publicBaseUrl}/traffic-flow.js" data-source-key="${source.public_key}" defer></script>`


  return {
    ok: true,

    project: {
      id:
        projectId,

      name:
        projectName,
    },

    source: {
      id:
        source.id,

      name:
        source.name,

      domain:
        source.domain,

      publicKey:
        source.public_key,

      isActive:
        source.is_active,

      createdAt:
        source.created_at,

      updatedAt:
        source.updated_at,
    },

    installation: {
      status:
        installationStatus,

      environment,

      publicBaseUrl,

      scriptUrl:
        `${publicBaseUrl}/traffic-flow.js`,

      script,

      supportedEvents:
        SUPPORTED_EVENTS,

      lastDetectedAt:
        matchingPageView
          ?.occurred_at ??
        null,

      lastDetectedPageUrl:
        matchingPageView
          ?.page_url ??
        null,

      lastDetectedMinutes:
        detectedMinutes,
    },
  }
}


/*
 * =========================================================
 * GET
 * =========================================================
 */

export async function GET(
  request: NextRequest
) {
  try {
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
            'projectId inválido.',
        },
        {
          status: 400,
        }
      )
    }


    const authorization =
      await getAuthorizedProject(
        projectId
      )


    if (
      !authorization.project
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            authorization.error,
        },
        {
          status:
            authorization.status,
        }
      )
    }


    return NextResponse.json(
      await buildSourceResponse(
        request,
        projectId,
        authorization
          .project
          .name
      )
    )
  } catch (error) {
    console.error(
      'TRACKING SOURCE GET ERROR:',
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


/*
 * =========================================================
 * POST
 *
 * Cria a fonte principal caso
 * o projeto ainda não tenha uma.
 * =========================================================
 */

export async function POST(
  request: NextRequest
) {
  try {
    let body: {
      projectId?: unknown
      name?: unknown
    }


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
        }
      )
    }


    const projectId =
      getString(
        body.projectId
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


    const authorization =
      await getAuthorizedProject(
        projectId
      )


    if (
      !authorization.project
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            authorization.error,
        },
        {
          status:
            authorization.status,
        }
      )
    }


    const admin =
      createAdminClient()


    /*
     * Reutilizamos a fonte existente.
     */

    const {
      data:
        existingSource,

      error:
        existingError,
    } =
      await admin
        .from(
          'tracking_sources'
        )
        .select('id')
        .eq(
          'project_id',
          projectId
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
      existingError
    ) {
      throw new Error(
        existingError.message
      )
    }


    if (
      !existingSource
    ) {
      const name =
        getString(
          body.name
        ) ??
        `${authorization.project.name} - Principal`


      const {
        error:
          insertError,
      } =
        await admin
          .from(
            'tracking_sources'
          )
          .insert({
            project_id:
              projectId,

            name,

            is_active:
              true,
          })


      if (
        insertError
      ) {
        throw new Error(
          insertError.message
        )
      }
    }


    return NextResponse.json(
      await buildSourceResponse(
        request,
        projectId,
        authorization
          .project
          .name
      )
    )
  } catch (error) {
    console.error(
      'TRACKING SOURCE POST ERROR:',
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


/*
 * =========================================================
 * PATCH
 *
 * Atualiza:
 *
 * - nome
 * - domínio
 * - ativo/inativo
 * =========================================================
 */

export async function PATCH(
  request: NextRequest
) {
  try {
    let body: {
      projectId?: unknown
      sourceId?: unknown
      name?: unknown
      domain?: unknown
      isActive?: unknown
    }


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
        }
      )
    }


    const projectId =
      getString(
        body.projectId
      )


    const sourceId =
      getString(
        body.sourceId
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


    if (
      !sourceId ||
      !isUuid(
        sourceId
      )
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'sourceId inválido.',
        },
        {
          status: 400,
        }
      )
    }


    const authorization =
      await getAuthorizedProject(
        projectId
      )


    if (
      !authorization.project
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            authorization.error,
        },
        {
          status:
            authorization.status,
        }
      )
    }


    const admin =
      createAdminClient()


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
          project_id
          `
        )
        .eq(
          'id',
          sourceId
        )
        .eq(
          'project_id',
          projectId
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
            'Fonte não encontrada.',
        },
        {
          status: 404,
        }
      )
    }


    const updateData:
      Record<
        string,
        unknown
      > = {}


    if (
      body.name !==
      undefined
    ) {
      const name =
        getString(
          body.name
        )


      if (!name) {
        return NextResponse.json(
          {
            ok: false,

            error:
              'Nome da fonte inválido.',
          },
          {
            status: 400,
          }
        )
      }


      updateData.name =
        name
    }


    if (
      body.domain !==
      undefined
    ) {
      const rawDomain =
        getString(
          body.domain
        )


      if (!rawDomain) {
        updateData.domain =
          null
      } else {
        const domain =
          normalizeDomain(
            rawDomain
          )


        if (!domain) {
          return NextResponse.json(
            {
              ok: false,

              error:
                'Domínio inválido.',
            },
            {
              status: 400,
            }
          )
        }


        updateData.domain =
          domain
      }
    }


    if (
      body.isActive !==
      undefined
    ) {
      if (
        typeof body
          .isActive !==
        'boolean'
      ) {
        return NextResponse.json(
          {
            ok: false,

            error:
              'isActive inválido.',
          },
          {
            status: 400,
          }
        )
      }


      updateData.is_active =
        body.isActive
    }


    if (
      Object.keys(
        updateData
      ).length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'Nenhuma alteração informada.',
        },
        {
          status: 400,
        }
      )
    }


    const {
      error:
        updateError,
    } =
      await admin
        .from(
          'tracking_sources'
        )
        .update(
          updateData
        )
        .eq(
          'id',
          sourceId
        )
        .eq(
          'project_id',
          projectId
        )


    if (
      updateError
    ) {
      throw new Error(
        updateError.message
      )
    }


    return NextResponse.json(
      await buildSourceResponse(
        request,
        projectId,
        authorization
          .project
          .name
      )
    )
  } catch (error) {
    console.error(
      'TRACKING SOURCE PATCH ERROR:',
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