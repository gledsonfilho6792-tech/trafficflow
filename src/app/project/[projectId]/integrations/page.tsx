import { createClient } from '@/lib/supabase/server'
import IntegrationsCenter from '@/components/integrations-center'
import MetaAccountSelector from '@/components/meta-account-selector'

type Props = {
  params: Promise<{
    projectId: string
  }>
}

type MetaAdAccount = {
  id: string
  account_id?: string
  name?: string
  account_status?: number
  currency?: string
  timezone_name?: string
}

export default async function IntegrationsPage({
  params,
}: Props) {
  const { projectId } = await params

  const supabase = await createClient()

  const { data: integrations } =
    await supabase
      .from('integrations')
      .select(
        `
        id,
        provider,
        integration_type,
        status,
        external_account_id,
        config
        `
      )
      .eq(
        'project_id',
        projectId
      )
      .order(
        'created_at',
        {
          ascending: true,
        }
      )

  const metaIntegration =
    integrations?.find(
      (integration) =>
        integration.provider ===
          'meta' &&
        integration.integration_type ===
          'ads'
    )

  const metaConfig =
    metaIntegration?.config &&
    typeof metaIntegration.config ===
      'object'
      ? metaIntegration.config
      : null

  const metaAccounts =
    (
      metaConfig as {
        available_ad_accounts?:
          MetaAdAccount[]
      } | null
    )?.available_ad_accounts ?? []

  return (
    <main className="p-6 md:p-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-8">
          <p className="text-sm text-zinc-500">
            Workspace
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            Integrações
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            Conecte fontes de tráfego,
            plataformas de venda, pixels
            e outros serviços ao seu projeto.
          </p>
        </div>

        {metaIntegration &&
          metaAccounts.length > 0 && (
            <section className="mb-10">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-zinc-200">
                  Conta Meta Ads
                </h2>

                <p className="mt-1 text-xs text-zinc-600">
                  Escolha qual conta de anúncios
                  será utilizada neste projeto.
                </p>
              </div>

              <MetaAccountSelector
                projectId={projectId}
                integrationId={
                  metaIntegration.id
                }
                currentExternalAccountId={
                  metaIntegration.external_account_id
                }
                accounts={metaAccounts}
              />
            </section>
          )}

        <IntegrationsCenter
          projectId={projectId}
          initialIntegrations={
            integrations?.map(
              (integration) => ({
                id: integration.id,
                provider:
                  integration.provider,
                integration_type:
                  integration.integration_type,
                status:
                  integration.status,
              })
            ) ?? []
          }
        />
      </div>
    </main>
  )
}