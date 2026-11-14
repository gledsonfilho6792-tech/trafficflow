;(function () {
  const currentScript =
    document.currentScript

  if (!currentScript) {
    console.error(
      '[Traffic Flow] Script atual não encontrado.'
    )

    return
  }


  /*
   * =======================================================
   * CONFIGURAÇÃO
   * =======================================================
   */

  const sourceKey =
    currentScript.getAttribute(
      'data-source-key'
    )

  if (!sourceKey) {
    console.error(
      '[Traffic Flow] data-source-key não informado.'
    )

    return
  }


  const scriptUrl =
    new URL(
      currentScript.src
    )


  const trackEndpoint =
    new URL(
      '/api/track',
      scriptUrl.origin
    ).toString()


  const tokenEndpoint =
    new URL(
      '/api/track/token',
      scriptUrl.origin
    ).toString()


  /*
   * =======================================================
   * STORAGE
   * =======================================================
   */

  const VISITOR_KEY =
    'traffic_flow_visitor_id'

  const SESSION_KEY =
    'traffic_flow_session'

  const ATTRIBUTION_KEY =
    'traffic_flow_attribution'

  const ATTRIBUTION_TOKEN_KEY =
    'traffic_flow_attribution_token'

  const SESSION_TTL =
    30 * 60 * 1000


  /*
   * =======================================================
   * HELPERS
   * =======================================================
   */

  function generateUUID() {
    if (
      window.crypto &&
      typeof window.crypto.randomUUID ===
        'function'
    ) {
      return window.crypto
        .randomUUID()
    }


    return (
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    ).replace(
      /[xy]/g,
      function (char) {
        const random =
          Math.random() *
            16 |
          0

        const value =
          char === 'x'
            ? random
            : (
                random &
                0x3
              ) |
              0x8

        return value
          .toString(16)
      }
    )
  }


  function cleanValue(
    value
  ) {
    if (
      typeof value !==
        'string'
    ) {
      return null
    }


    const cleaned =
      value.trim()


    return cleaned
      ? cleaned
      : null
  }


  function getCookie(
    name
  ) {
    const match =
      document.cookie.match(
        new RegExp(
          '(?:^|; )' +
          name.replace(
            /([.$?*|{}()[\]\\/+^])/g,
            '\\$1'
          ) +
          '=([^;]*)'
        )
      )


    return match
      ? decodeURIComponent(
          match[1]
        )
      : null
  }


  /*
   * =======================================================
   * VISITOR
   * =======================================================
   */

  function getVisitorId() {
    try {
      let visitorId =
        localStorage.getItem(
          VISITOR_KEY
        )


      if (!visitorId) {
        visitorId =
          generateUUID()


        localStorage.setItem(
          VISITOR_KEY,
          visitorId
        )
      }


      return visitorId
    } catch {
      return generateUUID()
    }
  }


  /*
   * =======================================================
   * SESSION
   * =======================================================
   */

  function getSessionId() {
    const now =
      Date.now()


    try {
      const saved =
        localStorage.getItem(
          SESSION_KEY
        )


      if (saved) {
        const parsed =
          JSON.parse(saved)


        const valid =
          parsed &&
          parsed.id &&
          parsed.lastSeen &&
          (
            now -
            Number(
              parsed.lastSeen
            )
          ) <
            SESSION_TTL


        if (valid) {
          localStorage.setItem(
            SESSION_KEY,

            JSON.stringify({
              id:
                parsed.id,

              lastSeen:
                now,
            })
          )


          return parsed.id
        }
      }
    } catch {
      // Nova sessão abaixo.
    }


    const sessionId =
      generateUUID()


    try {
      localStorage.setItem(
        SESSION_KEY,

        JSON.stringify({
          id:
            sessionId,

          lastSeen:
            now,
        })
      )
    } catch {
      // Storage indisponível.
    }


    return sessionId
  }


  /*
   * =======================================================
   * ATRIBUIÇÃO DA URL
   * =======================================================
   */

  function readUrlAttribution() {
    const params =
      new URLSearchParams(
        window.location.search
      )


    return {
      utmSource:
        cleanValue(
          params.get(
            'utm_source'
          )
        ),

      utmMedium:
        cleanValue(
          params.get(
            'utm_medium'
          )
        ),

      utmCampaign:
        cleanValue(
          params.get(
            'utm_campaign'
          )
        ),

      utmContent:
        cleanValue(
          params.get(
            'utm_content'
          )
        ),

      utmTerm:
        cleanValue(
          params.get(
            'utm_term'
          )
        ),

      fbclid:
        cleanValue(
          params.get(
            'fbclid'
          )
        ),

      gclid:
        cleanValue(
          params.get(
            'gclid'
          )
        ),

      ttclid:
        cleanValue(
          params.get(
            'ttclid'
          )
        ),

      metaCampaignId:
        cleanValue(
          params.get(
            'tf_campaign_id'
          )
        ),

      metaAdSetId:
        cleanValue(
          params.get(
            'tf_adset_id'
          )
        ),

      metaAdId:
        cleanValue(
          params.get(
            'tf_ad_id'
          )
        ),

      metaPlacement:
        cleanValue(
          params.get(
            'tf_placement'
          )
        ),

      metaSiteSource:
        cleanValue(
          params.get(
            'tf_site_source'
          )
        ),
    }
  }


  function getStoredAttribution() {
    try {
      const saved =
        localStorage.getItem(
          ATTRIBUTION_KEY
        )


      if (!saved) {
        return {}
      }


      const parsed =
        JSON.parse(
          saved
        )


      if (
        !parsed ||
        typeof parsed !==
          'object'
      ) {
        return {}
      }


      return parsed
    } catch {
      return {}
    }
  }


  function saveAttribution(
    attribution
  ) {
    try {
      localStorage.setItem(
        ATTRIBUTION_KEY,

        JSON.stringify(
          attribution
        )
      )
    } catch {
      // Storage indisponível.
    }
  }


  function getAttribution() {
    const stored =
      getStoredAttribution()

    const current =
      readUrlAttribution()


    const attribution = {
      utmSource:
        current.utmSource ??
        stored.utmSource ??
        null,

      utmMedium:
        current.utmMedium ??
        stored.utmMedium ??
        null,

      utmCampaign:
        current.utmCampaign ??
        stored.utmCampaign ??
        null,

      utmContent:
        current.utmContent ??
        stored.utmContent ??
        null,

      utmTerm:
        current.utmTerm ??
        stored.utmTerm ??
        null,

      fbclid:
        current.fbclid ??
        stored.fbclid ??
        null,

      gclid:
        current.gclid ??
        stored.gclid ??
        null,

      ttclid:
        current.ttclid ??
        stored.ttclid ??
        null,

      fbp:
        getCookie(
          '_fbp'
        ) ??
        stored.fbp ??
        null,

      fbc:
        getCookie(
          '_fbc'
        ) ??
        stored.fbc ??
        null,

      metaCampaignId:
        current.metaCampaignId ??
        stored.metaCampaignId ??
        null,

      metaAdSetId:
        current.metaAdSetId ??
        stored.metaAdSetId ??
        null,

      metaAdId:
        current.metaAdId ??
        stored.metaAdId ??
        null,

      metaPlacement:
        current.metaPlacement ??
        stored.metaPlacement ??
        null,

      metaSiteSource:
        current.metaSiteSource ??
        stored.metaSiteSource ??
        null,
    }


    saveAttribution(
      attribution
    )


    return attribution
  }


  /*
   * =======================================================
   * CONTEXTO
   * =======================================================
   */

  const visitorId =
    getVisitorId()

  const sessionId =
    getSessionId()

  const attribution =
    getAttribution()


  /*
   * =======================================================
   * ATTRIBUTION TOKEN
   * =======================================================
   */

  let attributionToken =
    null

  let attributionTokenPromise =
    null


  function readStoredAttributionToken() {
    try {
      const saved =
        localStorage.getItem(
          ATTRIBUTION_TOKEN_KEY
        )


      if (!saved) {
        return null
      }


      const parsed =
        JSON.parse(saved)


      if (
        !parsed ||
        typeof parsed !==
          'object'
      ) {
        return null
      }


      if (
        parsed.sessionId !==
          sessionId ||
        typeof parsed.token !==
          'string' ||
        !parsed.token.startsWith(
          'tf_'
        )
      ) {
        return null
      }


      if (
        parsed.expiresAt &&
        new Date(
          parsed.expiresAt
        ).getTime() <=
          Date.now()
      ) {
        return null
      }


      return parsed.token
    } catch {
      return null
    }
  }


  function saveAttributionToken(
    token,
    expiresAt
  ) {
    try {
      localStorage.setItem(
        ATTRIBUTION_TOKEN_KEY,

        JSON.stringify({
          sessionId,

          token,

          expiresAt:
            expiresAt ||
            null,
        })
      )
    } catch {
      // Storage indisponível.
    }
  }


  attributionToken =
    readStoredAttributionToken()


  async function ensureAttributionToken() {
    if (
      attributionToken
    ) {
      return attributionToken
    }


    if (
      attributionTokenPromise
    ) {
      return attributionTokenPromise
    }


    attributionTokenPromise =
      (async function () {
        try {
          const response =
            await fetch(
              tokenEndpoint,
              {
                method:
                  'POST',

                headers: {
                  'Content-Type':
                    'application/json',
                },

                body:
                  JSON.stringify({
                    sourceKey,

                    sessionId,

                    visitorId,
                  }),
              }
            )


          if (
            !response.ok
          ) {
            console.error(
              '[Traffic Flow] Não foi possível gerar attribution token:',
              response.status
            )

            return null
          }


          const result =
            await response.json()


          if (
            !result ||
            result.ok !==
              true ||
            typeof result.token !==
              'string'
          ) {
            console.error(
              '[Traffic Flow] Attribution token inválido.'
            )

            return null
          }


          attributionToken =
            result.token


          saveAttributionToken(
            result.token,
            result.expiresAt
          )


          return attributionToken
        } catch (error) {
          console.error(
            '[Traffic Flow] Falha ao obter attribution token:',
            error
          )

          return null
        } finally {
          attributionTokenPromise =
            null
        }
      })()


    return attributionTokenPromise
  }


  /*
   * =======================================================
   * EVENT TRACKING
   * =======================================================
   */

  async function track(
    eventName,
    metadata
  ) {
    const payload = {
      sourceKey,

      eventName,

      visitorId,
      sessionId,

      pageUrl:
        window.location.href,

      referrer:
        document.referrer ||
        null,

      ...attribution,

      metadata:
        metadata || {},
    }


    try {
      const response =
        await fetch(
          trackEndpoint,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(
                payload
              ),

            keepalive:
              true,
          }
        )


      if (
        !response.ok
      ) {
        console.error(
          '[Traffic Flow] Erro ao enviar evento:',
          response.status
        )
      }


      return response
    } catch (error) {
      console.error(
        '[Traffic Flow] Falha no tracking:',
        error
      )


      return null
    }
  }


  /*
   * =======================================================
   * CHECKOUT PROVIDERS
   * =======================================================
   */

  function detectCheckoutProvider(
    checkoutUrl
  ) {
    const hostname =
      checkoutUrl.hostname
        .toLowerCase()


    /*
     * APPLYFY
     */

    if (
      hostname ===
        'checkout.applyfy.com.br' ||
      hostname.endsWith(
        '.applyfy.com.br'
      )
    ) {
      return 'applyfy'
    }


    return null
  }


  /*
   * =======================================================
   * IDENTIFICAR LINK DE CHECKOUT
   * =======================================================
   *
   * Existem dois modos:
   *
   * 1. automático:
   *    reconhece domínio do provider
   *
   * 2. manual:
   *    data-traffic-flow-checkout
   *
   * O atributo:
   *
   * data-traffic-flow-ignore
   *
   * permite excluir um link específico.
   * =======================================================
   */

  function getCheckoutLinkInfo(
    link
  ) {
    if (
      !link ||
      typeof link.getAttribute !==
        'function'
    ) {
      return null
    }


    if (
      link.hasAttribute(
        'data-traffic-flow-ignore'
      )
    ) {
      return null
    }


    const href =
      link.getAttribute(
        'href'
      )


    if (!href) {
      return null
    }


    let checkoutUrl


    try {
      checkoutUrl =
        new URL(
          href,
          window.location.href
        )
    } catch {
      return null
    }


    const provider =
      detectCheckoutProvider(
        checkoutUrl
      )


    const explicit =
      link.hasAttribute(
        'data-traffic-flow-checkout'
      )


    if (
      !provider &&
      !explicit
    ) {
      return null
    }


    return {
      href,

      checkoutUrl,

      provider,

      explicit,
    }
  }


  /*
   * =======================================================
   * DECORAR CHECKOUT
   * =======================================================
   */

  function decorateCheckoutUrlWithToken(
    url,
    token
  ) {
    if (
      !url ||
      typeof url !==
        'string'
    ) {
      return url
    }


    let checkoutUrl


    try {
      checkoutUrl =
        new URL(
          url,
          window.location.href
        )
    } catch {
      return url
    }


    function setIfAvailable(
      key,
      value
    ) {
      if (
        value !== null &&
        value !== undefined &&
        value !== ''
      ) {
        checkoutUrl
          .searchParams
          .set(
            key,
            String(value)
          )
      }
    }


    /*
     * IDs Traffic Flow.
     */

    setIfAvailable(
      'tf_session_id',
      sessionId
    )

    setIfAvailable(
      'tf_visitor_id',
      visitorId
    )

    setIfAvailable(
      'tf_source_key',
      sourceKey
    )


    /*
     * UTMs.
     */

    setIfAvailable(
      'utm_source',
      attribution.utmSource
    )

    setIfAvailable(
      'utm_medium',
      attribution.utmMedium
    )

    setIfAvailable(
      'utm_campaign',
      attribution.utmCampaign
    )

    setIfAvailable(
      'utm_content',
      attribution.utmContent
    )

    setIfAvailable(
      'utm_term',
      attribution.utmTerm
    )


    /*
     * Click IDs.
     */

    setIfAvailable(
      'fbclid',
      attribution.fbclid
    )

    setIfAvailable(
      'gclid',
      attribution.gclid
    )

    setIfAvailable(
      'ttclid',
      attribution.ttclid
    )


    /*
     * Meta browser identifiers.
     */

    setIfAvailable(
      'tf_fbp',
      attribution.fbp
    )

    setIfAvailable(
      'tf_fbc',
      attribution.fbc
    )


    const provider =
      detectCheckoutProvider(
        checkoutUrl
      )


    /*
     * APPLYFY
     *
     * A Applyfy preserva utm_term
     * no webhook.
     *
     * Por isso usamos esse campo
     * como transporte do token tf_.
     *
     * O utm_term original continua
     * preservado na tracking_session.
     */

    if (
      provider ===
        'applyfy' &&
      token
    ) {
      checkoutUrl
        .searchParams
        .set(
          'utm_term',
          token
        )
    }


    return checkoutUrl
      .toString()
  }


  function decorateCheckoutUrl(
    url
  ) {
    return decorateCheckoutUrlWithToken(
      url,
      attributionToken
    )
  }


  async function decorateCheckoutUrlAsync(
    url
  ) {
    const token =
      await ensureAttributionToken()


    return decorateCheckoutUrlWithToken(
      url,
      token
    )
  }


  /*
   * =======================================================
   * DECORAR UM LINK
   * =======================================================
   */

  function decorateCheckoutLink(
    link
  ) {
    const info =
      getCheckoutLinkInfo(
        link
      )


    if (!info) {
      return false
    }


    const decorated =
      decorateCheckoutUrl(
        info.href
      )


    /*
     * Evita mutation loop.
     */

    if (
      decorated &&
      decorated !==
        info.href
    ) {
      link.setAttribute(
        'href',
        decorated
      )
    }


    return true
  }


  /*
   * =======================================================
   * ESCANEAR LINKS EXISTENTES
   * =======================================================
   */

  function scanCheckoutLinks(
    root
  ) {
    const container =
      root ||
      document


    /*
     * Caso o próprio node
     * seja um <a>.
     */

    if (
      container instanceof
        HTMLAnchorElement
    ) {
      decorateCheckoutLink(
        container
      )

      return
    }


    if (
      typeof container
        .querySelectorAll !==
      'function'
    ) {
      return
    }


    const links =
      container
        .querySelectorAll(
          'a[href]'
        )


    links.forEach(
      function (link) {
        decorateCheckoutLink(
          link
        )
      }
    )
  }


  /*
   * =======================================================
   * TOKEN + LINKS INICIAIS
   * =======================================================
   */

  void ensureAttributionToken()
    .then(
      function () {
        scanCheckoutLinks(
          document
        )
      }
    )


  /*
   * Também fazemos uma leitura imediata.
   *
   * Se o token ainda não estiver pronto,
   * o link receberá os demais parâmetros.
   * Depois ele será atualizado novamente.
   */

  scanCheckoutLinks(
    document
  )


  /*
   * =======================================================
   * LINKS CRIADOS DINAMICAMENTE
   * =======================================================
   *
   * Importante para React / Lovable.
   * =======================================================
   */

  const checkoutObserver =
    new MutationObserver(
      function (
        mutations
      ) {
        mutations.forEach(
          function (
            mutation
          ) {
            /*
             * Novos elementos.
             */

            if (
              mutation.type ===
                'childList'
            ) {
              mutation
                .addedNodes
                .forEach(
                  function (
                    node
                  ) {
                    if (
                      node.nodeType !==
                        1
                    ) {
                      return
                    }


                    scanCheckoutLinks(
                      node
                    )
                  }
                )
            }


            /*
             * href alterado dinamicamente.
             */

            if (
              mutation.type ===
                'attributes' &&
              mutation.target instanceof
                HTMLAnchorElement
            ) {
              decorateCheckoutLink(
                mutation.target
              )
            }
          }
        )
      }
    )


  if (
    document.documentElement
  ) {
    checkoutObserver.observe(
      document.documentElement,
      {
        childList:
          true,

        subtree:
          true,

        attributes:
          true,

        attributeFilter: [
          'href',
        ],
      }
    )
  }


  /*
   * =======================================================
   * CLICK CHECKOUT
   * =======================================================
   */

  document.addEventListener(
    'click',

    async function (
      event
    ) {
      const target =
        event.target


      if (
        !target ||
        typeof target.closest !==
          'function'
      ) {
        return
      }


      /*
       * Agora procuramos qualquer
       * link <a href>.
       *
       * getCheckoutLinkInfo decide
       * se é realmente checkout.
       */

      const link =
        target.closest(
          'a[href]'
        )


      if (!link) {
        return
      }


      const info =
        getCheckoutLinkInfo(
          link
        )


      if (!info) {
        return
      }


      const originalUrl =
        info.href


      /*
       * Token disponível:
       *
       * não bloqueamos navegação.
       */

      if (
        attributionToken
      ) {
        const decoratedUrl =
          decorateCheckoutUrlWithToken(
            originalUrl,
            attributionToken
          )


        if (
          decoratedUrl !==
          originalUrl
        ) {
          link.setAttribute(
            'href',
            decoratedUrl
          )
        }


        void track(
          'initiate_checkout',
          {
            checkoutUrl:
              decoratedUrl,

            checkoutProvider:
              info.provider ??
              'manual',

            attributionToken,
          }
        )


        return
      }


      /*
       * Token ainda carregando:
       *
       * seguramos o clique por alguns
       * milissegundos para não perder
       * a atribuição.
       */

      event.preventDefault()


      const decoratedUrl =
        await decorateCheckoutUrlAsync(
          originalUrl
        )


      void track(
        'initiate_checkout',
        {
          checkoutUrl:
            decoratedUrl,

          checkoutProvider:
            info.provider ??
            'manual',

          attributionToken,
        }
      )


      const targetWindow =
        link.getAttribute(
          'target'
        )


      if (
        targetWindow ===
          '_blank'
      ) {
        window.open(
          decoratedUrl,
          '_blank'
        )
      } else {
        window.location.href =
          decoratedUrl
      }
    },
    true
  )


  /*
   * =======================================================
   * API PÚBLICA
   * =======================================================
   */

  window.TrafficFlow = {
    track,


    getVisitorId:
      function () {
        return visitorId
      },


    getSessionId:
      function () {
        return sessionId
      },


    getAttribution:
      function () {
        return {
          ...attribution,
        }
      },


    getAttributionToken:
      function () {
        return ensureAttributionToken()
      },


    decorateCheckoutUrl,


    decorateCheckoutUrlAsync,


    /*
     * Útil para páginas que renderizam
     * componentes manualmente.
     */

    scanCheckoutLinks:
      function () {
        scanCheckoutLinks(
          document
        )
      },
  }


  /*
   * =======================================================
   * PAGE VIEW
   * =======================================================
   */

  void track(
    'page_view',
    {
      title:
        document.title,
    }
  )
})()