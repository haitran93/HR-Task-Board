import { createContext, useContext, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { api } from './api'

const CurrentUserContext = createContext(null)

export function CurrentUserProvider({ children }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState(undefined) // undefined = not checked yet, null = signed out

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      queryClient.invalidateQueries()
    })
    return () => sub.subscription.unsubscribe()
  }, [queryClient])

  const { data: people = [] } = useQuery({
    queryKey: ['people'],
    queryFn: api.getPeople,
    enabled: !!session,
  })

  const currentUser = session ? people.find((p) => p.auth_user_id === session.user.id) || null : null

  async function signOut() {
    await supabase.auth.signOut()
  }

  const value = { session, sessionLoading: session === undefined, people, currentUser, signOut }

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext)
  if (!ctx) throw new Error('useCurrentUser must be used within CurrentUserProvider')
  return ctx
}
