import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface Profile {
  username: string | null
  city: string | null
}

async function fetchProfile(userId: string): Promise<Profile> {
  const { data } = await supabase
    .from('profiles')
    .select('username, city')
    .eq('id', userId)
    .single()
  return { username: data?.username ?? null, city: data?.city ?? null }
}

export function useAuth() {
  const [user, setUser]       = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile>({ username: null, city: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) setProfile(await fetchProfile(u.id).catch(() => ({ username: null, city: null })))
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchProfile(u.id).catch(() => ({ username: null, city: null })).then(setProfile)
      else setProfile({ username: null, city: null })
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, profile, loading }
}
