'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface AuthState {
  user: User | null
  profile: Profile | null
  isLoading: boolean
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    isLoading: true,
  })

  useEffect(() => {
    let supabase: SupabaseClient
    try {
      supabase = createClient()
    } catch {
      setState({ user: null, profile: null, isLoading: false })
      return
    }
    let mounted = true

    async function loadProfile(userId: string) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      return data as Profile | null
    }

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!mounted) return
      if (user) {
        const profile = await loadProfile(user.id)
        if (mounted) setState({ user, profile, isLoading: false })
      } else {
        setState({ user: null, profile: null, isLoading: false })
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      if (session?.user) {
        const profile = await loadProfile(session.user.id)
        if (mounted) setState({ user: session.user, profile, isLoading: false })
      } else {
        setState({ user: null, profile: null, isLoading: false })
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return state
}
