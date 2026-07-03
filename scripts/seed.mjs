// One-off script: seeds the real 7-person roster into Supabase Auth + `people`
// + function memberships. Safe to re-run (skips people/auth users that already exist).
//
// Usage:
//   1. Put these in a LOCAL, GITIGNORED `.env` at the project root (never commit it):
//        SUPABASE_URL=...
//        SUPABASE_SERVICE_ROLE_KEY=...   (service role key — never share this, never put it in chat)
//        PASSCODE_HAITT5=...
//        PASSCODE_THYNX=...
//        PASSCODE_PHUONGNNX=...
//        PASSCODE_ANHPTL=...
//        PASSCODE_NHANLTP=...
//        PASSCODE_TRANGPTT12=...
//        PASSCODE_VING=...
//   2. Run: node --env-file=.env scripts/seed.mjs
//
// Passcodes are read from env on purpose — never hardcode real passcodes into a
// script that might end up committed to the repo.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. See the usage comment at the top of this file.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PEOPLE = [
  { username: 'haitt5', name: 'Hai Trần Thanh', isAdmin: true, avatarColor: '#141414', functions: [] },
  { username: 'thynx', name: 'ThyNX', isAdmin: false, avatarColor: '#EAB308', functions: ['Rewards & Culture', 'HRBP'] },
  { username: 'phuongnnx', name: 'PhuongNNX', isAdmin: false, avatarColor: '#2E5FE4', functions: ['HRBP', 'Office Management'] },
  { username: 'anhptl', name: 'AnhPTL', isAdmin: false, avatarColor: '#2E7D4F', functions: ['L&D', 'HRBP'] },
  { username: 'nhanltp', name: 'NhanLTP', isAdmin: false, avatarColor: '#E4572E', functions: ['L&D'] },
  { username: 'trangptt12', name: 'TrangPTT12', isAdmin: false, avatarColor: '#2E5FE4', functions: ['Recruiting'] },
  { username: 'ving', name: 'ViNG', isAdmin: false, avatarColor: '#2E7D4F', functions: ['HRBP', 'Onboarding', 'Office Management'] },
]

function passcodeFor(username) {
  const envKey = `PASSCODE_${username.toUpperCase()}`
  const value = process.env[envKey]
  if (!value) throw new Error(`Missing env var ${envKey} for ${username}`)
  return value
}

function syntheticEmail(username) {
  return `${username}@hrhub.local`
}

async function main() {
  const { data: functionRows, error: fnErr } = await supabase.from('functions').select('id, name')
  if (fnErr) throw fnErr
  const functionIdByName = Object.fromEntries(functionRows.map((f) => [f.name, f.id]))

  for (const person of PEOPLE) {
    const email = syntheticEmail(person.username)

    const { data: existingPerson } = await supabase.from('people').select('id, auth_user_id').eq('username', person.username).maybeSingle()

    let authUserId = existingPerson?.auth_user_id
    if (!authUserId) {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: passcodeFor(person.username),
        email_confirm: true,
      })
      if (createErr) throw createErr
      authUserId = created.user.id
      console.log(`created auth user for ${person.username}`)
    } else {
      // Always sync the password on re-runs (idempotent) rather than skip it —
      // otherwise a fixed/rotated passcode in .env silently never reaches Supabase.
      const { error: updateErr } = await supabase.auth.admin.updateUserById(authUserId, {
        password: passcodeFor(person.username),
      })
      if (updateErr) throw updateErr
      console.log(`auth user already exists for ${person.username}, synced password`)
    }

    const { data: personRow, error: upsertErr } = await supabase
      .from('people')
      .upsert(
        {
          id: existingPerson?.id,
          auth_user_id: authUserId,
          username: person.username,
          name: person.name,
          avatar_color: person.avatarColor,
          is_admin: person.isAdmin,
        },
        { onConflict: 'username' }
      )
      .select('id')
      .single()
    if (upsertErr) throw upsertErr

    if (person.functions.length) {
      const rows = person.functions.map((fnName) => {
        const functionId = functionIdByName[fnName]
        if (!functionId) throw new Error(`Unknown function "${fnName}" — check the static seed in 0001_init.sql`)
        return { person_id: personRow.id, function_id: functionId }
      })
      const { error: pfErr } = await supabase.from('person_functions').upsert(rows, { onConflict: 'person_id,function_id' })
      if (pfErr) throw pfErr
    }

    console.log(`seeded ${person.username} (${person.name})`)
  }

  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
