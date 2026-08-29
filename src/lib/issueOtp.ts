import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import {
  adminLoginCodeHtml,
  adminLoginCodeText,
  passwordResetCodeHtml,
  passwordResetCodeText,
  verificationCodeHtml,
  verificationCodeText,
} from '@/lib/emailTemplates'
import { generateOtp, hashOtp, OTP_TTL_MS } from '@/lib/otp'

export type OtpPurpose = 'signup' | 'password_reset' | 'admin_login'

/**
 * Generates a fresh code for one purpose, replaces any previous code for that
 * same purpose, and emails it. Returns false only if the email itself couldn't
 * be sent — the caller decides whether that's fatal.
 */
export async function issueOtp(args: {
  userId: string
  email: string
  name: string
  purpose: OtpPurpose
}): Promise<boolean> {
  const admin = createAdminClient()
  const code = generateOtp()

  // Upsert on (user_id, purpose) wipes any earlier code for this flow and
  // resets the attempt counter, so a resend always invalidates the previous
  // code rather than leaving two valid at once.
  const { error } = await admin.from('email_verification_codes').upsert(
    {
      user_id: args.userId,
      purpose: args.purpose,
      code_hash: hashOtp(code),
      expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      attempts: 0,
      last_sent_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,purpose' }
  )

  if (error) {
    console.error('[otp] could not store code:', error.message)
    return false
  }

  const minutes = Math.round(OTP_TTL_MS / 60000)

  // The code deliberately stays out of the subject line. Subjects are
  // retained by the mail provider, surface in our own email audit log, and
  // show up in lock-screen notification previews — putting a live credential
  // there leaks it to anyone who can see any of those.
  const variants = {
    signup: {
      subject: 'Your Patel Farsan verification code',
      html: verificationCodeHtml(args.name, code, minutes),
      text: verificationCodeText(args.name, code, minutes),
      context: 'signup-otp',
    },
    password_reset: {
      subject: 'Your Patel Farsan password reset code',
      html: passwordResetCodeHtml(args.name, code, minutes),
      text: passwordResetCodeText(args.name, code, minutes),
      context: 'password-reset-otp',
    },
    admin_login: {
      subject: 'Your Patel Farsan admin security code',
      html: adminLoginCodeHtml(args.name, code, minutes),
      text: adminLoginCodeText(args.name, code, minutes),
      context: 'admin-login-otp',
    },
  }[args.purpose]

  return sendEmail({
    to: { email: args.email, name: args.name },
    subject: variants.subject,
    html: variants.html,
    text: variants.text,
    context: variants.context,
  })
}
