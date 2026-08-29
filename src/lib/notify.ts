import { createAdminClient } from '@/lib/supabase/admin'

/** Where shop-facing notifications (new orders, contact form) are delivered. */
export function adminInbox(): string | null {
  return process.env.CONTACT_TO_EMAIL || process.env.BREVO_SENDER_EMAIL || null
}

/**
 * Resolves the customer behind an order. Returns null when the account has no
 * usable email — accounts created before email became mandatory at signup used
 * a synthetic `<phone>@patelfarsan.local` address that can't receive mail.
 */
export async function orderRecipient(
  userId: string
): Promise<{ email: string; name: string } | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('email, name')
    .eq('id', userId)
    .maybeSingle()

  if (!data?.email || data.email.endsWith('@patelfarsan.local')) return null
  return { email: data.email, name: data.name || 'there' }
}
