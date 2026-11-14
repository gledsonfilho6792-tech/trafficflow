import {
  NextResponse,
  type NextRequest,
} from 'next/server'

import {
  updateSession,
} from '@/lib/supabase/proxy'

export async function proxy(
  request: NextRequest
) {
  const pathname =
    request.nextUrl.pathname

  /*
   * Endpoint de automação.
   *
   * Não usa login Supabase.
   * Possui autenticação própria
   * via AUTOMATION_SECRET.
   */
  if (
  pathname === '/traffic-flow.js' ||
  pathname.startsWith('/api/automation/') ||
  pathname.startsWith('/api/webhooks/') ||
  pathname.startsWith('/api/track')
) {
  return NextResponse.next()
}

  return await updateSession(
    request
  )
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
