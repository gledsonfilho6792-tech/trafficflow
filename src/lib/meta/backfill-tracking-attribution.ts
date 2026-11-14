import {
  createAdminClient,
} from '@/lib/supabase/admin'


type BackfillResult = {
  updatedAds: number
  updatedAdSets: number
  updatedCampaigns: number
}


export async function backfillMetaTrackingAttribution(
  projectId: string
): Promise<BackfillResult> {
  const admin =
    createAdminClient()


  const {
    data,
    error,
  } =
    await admin.rpc(
      'backfill_tracking_meta_attribution',
      {
        p_project_id:
          projectId,
      }
    )


  if (error) {
    throw new Error(
      `Erro no backfill de atribuição Meta: ${error.message}`
    )
  }


  const row =
    Array.isArray(data)
      ? data[0]
      : data


  return {
    updatedAds:
      Number(
        row?.updated_ads ??
          0
      ),

    updatedAdSets:
      Number(
        row?.updated_ad_sets ??
          0
      ),

    updatedCampaigns:
      Number(
        row?.updated_campaigns ??
          0
      ),
  }
}