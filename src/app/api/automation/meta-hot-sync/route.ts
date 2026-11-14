import { NextRequest } from 'next/server'
import { runWorkspaceAutomation } from '@/lib/workspace/cron'
export const dynamic='force-dynamic'
export const maxDuration=300
export async function POST(request:NextRequest){return runWorkspaceAutomation(request,'hot')}
