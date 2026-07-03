import { useState } from 'react'
import { supabase, usernameToEmail } from '../lib/supabase'

export default function Login() {
  const [username, setUsername] = useState('')
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password: passcode,
    })
    setLoading(false)
    if (signInError) setError('Wrong username or passcode.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <form
        onSubmit={handleSubmit}
        className="bg-white border-2 border-ink rounded-card shadow-card w-[360px] p-8 flex flex-col gap-4"
      >
        <div className="flex items-center gap-[10px] mb-2">
          <div className="w-[34px] h-[34px] bg-ink rounded-chip flex items-center justify-center text-accent font-bold text-base">
            H
          </div>
          <div className="font-bold text-[17px] -tracking-[0.02em]">HR Hub</div>
        </div>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          Username
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border-2 border-ink rounded-btn px-3 py-2 font-medium text-sm"
            placeholder="e.g. haitt5"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          Passcode
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="border-2 border-ink rounded-btn px-3 py-2 font-medium text-sm"
          />
        </label>

        {error && <div className="text-sm font-semibold text-program-retreat">{error}</div>}

        <button
          type="submit"
          disabled={loading || !username || !passcode}
          className="hard-btn mt-2 px-4 py-2 bg-accent border-2 border-ink rounded-btn font-bold text-sm shadow-btn disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
