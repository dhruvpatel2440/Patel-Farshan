import { createClient } from '@/lib/supabase/server'
import { hasAdminElevation } from '@/lib/adminSession'
import { setAuditActor } from '@/lib/audit'
import type { User } from '@supabase/supabase-js'

/**
 * Verifies the requesting user is signed in, has role='admin', AND holds a
 * current admin elevation from /admin-login.
 *
 * The elevation check matters here as much as in the layout: without it, the
 * admin write endpoints would still be reachable with nothing but a normal
 * customer session belonging to an admin account.
 */
export async function requireAdmin(): Promise<
  { user: User } | { error: string; status: number }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized', status: 401 }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: 'Forbidden', status: 403 }
  }

  if (!(await hasAdminElevation(user.id))) {
    return { error: 'Admin session expired. Sign in again at /admin-login.', status: 403 }
  }

  // Attributes the audit entry for this request, when it is an audited route.
  setAuditActor({ id: user.id, name: profile.name, email: user.email })

  return { user }
}
