-- ============================================================
-- Redact one-time codes from already-logged email subjects
-- ============================================================
-- OTP emails used to carry the live code in the subject line, so it was
-- written into the audit log in plaintext and shown in the admin UI. The
-- subject no longer contains the code, and the logging layer redacts as a
-- backstop — this scrubs the rows recorded before that.

update public.email_logs
set subject = regexp_replace(subject, '\m\d{4,8}\M', '••••••', 'g')
where context like '%-otp'
  and subject ~ '\m\d{4,8}\M';
