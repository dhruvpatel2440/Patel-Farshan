import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })
    if (error) throw error
    return NextResponse.json({ cities: data ?? [] })
  } catch {
    return NextResponse.json({ cities: [] })
  }
}
