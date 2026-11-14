import TrackingSourceConfig from '@/components/tracking-source-config'
import MetaTrackingParameters from '@/components/meta-tracking-parameters'
import TrackingReadiness from '@/components/tracking-readiness'
import TrackingE2ETest from '@/components/tracking-e2e-test'
import TrackingHealthPanel from '@/components/tracking-health-panel'


type Props = {
  params: Promise<{
    projectId: string
  }>
}


export default async function TrackingPage({
  params,
}: Props) {
  const {
    projectId,
  } =
    await params


  return (
    <main className="p-6 md:p-8">
      <div className="mx-auto max-w-[1600px]">

        <div>
          <p className="text-sm text-zinc-500">
            Monitoramento
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            Tracking
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            Configure, teste e monitore toda a infraestrutura de tracking e atribuição do projeto.
          </p>
        </div>


        <TrackingSourceConfig
          projectId={
            projectId
          }
        />


        <MetaTrackingParameters />


        <TrackingReadiness
          projectId={
            projectId
          }
        />


        <TrackingE2ETest
          projectId={
            projectId
          }
        />


        <TrackingHealthPanel
          projectId={
            projectId
          }
        />
      </div>
    </main>
  )
}