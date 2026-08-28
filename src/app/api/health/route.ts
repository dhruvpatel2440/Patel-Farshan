export async function GET() {
  const checks = {
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    upi_id: !!process.env.NEXT_PUBLIC_UPI_ID,
    site_url: !!process.env.NEXT_PUBLIC_SITE_URL,
  }
  const allGood = Object.values(checks).every(Boolean)
  return Response.json({ status: allGood ? 'ok' : 'missing_env', checks })
}
