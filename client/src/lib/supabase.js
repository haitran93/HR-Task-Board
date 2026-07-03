import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy client/.env.local.example to client/.env.local and fill them in.'
  )
}

export const supabase = createClient(url, anonKey)

export function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@hrhub.local`
}

export function icsFeedUrl() {
  return `${url}/functions/v1/calendar-ics`
}
