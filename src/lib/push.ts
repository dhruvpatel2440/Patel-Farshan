import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

/** What the service worker turns into a notification. Kept small — push
 *  services cap payloads at ~4KB. */
export interface PushPayload {
  title: string
  body: string
  /** Opened when the notification is tapped. */
  url?: string
  /** Notifications sharing a tag replace each other, so an order that moves
   *  from packed to out-for-delivery shows one entry, not a pile. */
  tag?: string
}

let configured: boolean | null = null

function configure(): boolean {
  if (configured !== null) return configured
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    configured = false
    return false
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:patelfarshan1985@gmail.com',
    publicKey,
    privateKey
  )
  configured = true
  return true
}

async function sendToUsers(userIds: string[], payload: PushPayload) {
  if (!configure() || userIds.length === 0) return

  const admin = createAdminClient()
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', userIds)

  if (!subs?.length) return

  const body = JSON.stringify(payload)
  const expired: string[] = []
  const delivered: string[] = []

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
          // An order update that arrives a day late is worse than none.
          { TTL: 60 * 60 * 12, urgency: 'high' }
        )
        delivered.push(sub.id)
      } catch (error) {
        // 404/410: the customer uninstalled the app, cleared site data or
        // revoked permission. That device is gone for good — forget it.
        const status = (error as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) expired.push(sub.id)
      }
    })
  )

  if (expired.length) {
    await admin.from('push_subscriptions').delete().in('id', expired)
  }
  if (delivered.length) {
    await admin
      .from('push_subscriptions')
      .update({ last_used_at: new Date().toISOString() })
      .in('id', delivered)
  }
}

/**
 * Best-effort, like the emails: a push that fails to send must never fail the
 * order action that triggered it. Silently does nothing until the VAPID keys
 * are set.
 */
export async function pushToUser(userId: string, payload: PushPayload) {
  try {
    await sendToUsers([userId], payload)
  } catch {
    // Swallowed on purpose — see above.
  }
}

/** Every admin account's devices — for new orders the shop needs to see. */
export async function pushToAdmins(payload: PushPayload) {
  try {
    const admin = createAdminClient()
    const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin')
    await sendToUsers((admins ?? []).map((a) => a.id), payload)
  } catch {
    // Swallowed on purpose — see pushToUser.
  }
}

