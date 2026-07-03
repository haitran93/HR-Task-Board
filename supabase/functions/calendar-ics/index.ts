// Public ICS feed for "Subscribe in Outlook". Deploy with:
//   supabase functions deploy calendar-ics --no-verify-jwt
// (--no-verify-jwt because Outlook polls this URL anonymously.)
//
// Uses the SERVICE ROLE key (set via `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...`,
// never the client's anon key) because events/projects are RLS-restricted to
// `authenticated` users, and this function has no user session to authenticate
// with — it runs trusted server-side, so it's safe to bypass RLS here. It only
// ever returns event titles/dates/project names, nothing person-identifying
// beyond what's already visible to any signed-in team member.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function toICSDate(dateStr: string) {
  return dateStr.replaceAll('-', '')
}

function nextDay(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function escapeText(str: string) {
  return str.replace(/[\\;,]/g, (m) => `\\${m}`)
}

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: events, error: eventsError } = await supabase.from('events').select('*').order('date')
  if (eventsError) return new Response(eventsError.message, { status: 500 })

  const { data: projects, error: projectsError } = await supabase.from('projects').select('*')
  if (projectsError) return new Response(projectsError.message, { status: 500 })
  const projectsById = Object.fromEntries((projects ?? []).map((p) => [p.id, p]))

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HR Hub//Program Calendar//EN',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:HR Program Hub',
  ]

  for (const e of events ?? []) {
    const project = projectsById[e.project_id]
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}@hr-program-hub`,
      `DTSTAMP:${toICSDate(new Date().toISOString().slice(0, 10))}T000000Z`,
      `DTSTART;VALUE=DATE:${toICSDate(e.date)}`,
      `DTEND;VALUE=DATE:${toICSDate(nextDay(e.date))}`,
      `SUMMARY:${escapeText(`${e.is_milestone ? '◆ ' : ''}${e.title}`)}`,
      `CATEGORIES:${escapeText(project ? project.name : '')}`,
      'END:VEVENT'
    )
  }
  lines.push('END:VCALENDAR')

  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="hr-program-hub.ics"',
    },
  })
})
