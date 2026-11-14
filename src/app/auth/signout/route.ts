import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
export async function POST(){const client=await createClient();const {error}=await client.auth.signOut();return NextResponse.json({ok:!error},{status:error?500:200})}
