import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { addMonths, subMonths, format } from 'date-fns'
import { api } from '../lib/api'
import { useCurrentUser } from '../lib/currentUser'
import { icsFeedUrl } from '../lib/supabase'
import TopBar from '../components/TopBar'
import MonthGrid from '../components/MonthGrid'

export default function CalendarPage() {
  const { people } = useCurrentUser()
  const [month, setMonth] = useState(new Date())
  const [projectFilter, setProjectFilter] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.getProjects })
  const monthKey = format(month, 'yyyy-MM')
  const { data: events = [] } = useQuery({
    queryKey: ['events', monthKey],
    queryFn: () => api.getEvents(monthKey),
  })

  const projectsById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects])
  const filteredEvents = projectFilter ? events.filter((e) => e.project_id === projectFilter) : events
  const nextDeadline = events.slice().sort((a, b) => a.date.localeCompare(b.date))[0]

  return (
    <div>
      <TopBar
        rightExtra={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMonth((m) => subMonths(m, 1))}
              className="px-[14px] py-2 border-2 border-ink rounded-btn font-bold text-sm bg-white"
            >
              ◀
            </button>
            <div className="font-bold text-lg -tracking-[0.02em]">{format(month, 'MMMM yyyy')}</div>
            <button
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="px-[14px] py-2 border-2 border-ink rounded-btn font-bold text-sm bg-white"
            >
              ▶
            </button>
            <a
              href={icsFeedUrl()}
              className="hard-btn px-[18px] py-2 bg-accent border-2 border-ink rounded-btn font-bold text-sm shadow-btn"
            >
              Subscribe ↗
            </a>
          </div>
        }
      />
      <div className="grid grid-cols-[250px_1fr] gap-7 px-8 pt-7 pb-9">
        <div className="flex flex-col gap-[18px]">
          <div className="bg-white border-2 border-ink rounded-card px-5 py-[18px]">
            <div className="text-xs font-bold tracking-[0.1em] text-muted mb-3">PROJECTS</div>
            <div className="flex flex-col gap-[10px]">
              {projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setProjectFilter((cur) => (cur === p.id ? null : p.id))}
                  className={`flex gap-[10px] items-center font-semibold text-sm cursor-pointer ${
                    projectFilter && projectFilter !== p.id ? 'opacity-40' : ''
                  }`}
                >
                  <span className="w-4 h-4 border-2 border-ink rounded-[5px]" style={{ background: p.color }} />
                  {p.name}
                </div>
              ))}
            </div>
          </div>
          {nextDeadline && (
            <div className="bg-ink text-bg border-2 border-ink rounded-card px-5 py-[18px] shadow-emphasisYellow">
              <div className="font-bold text-[15px]">Next deadline</div>
              <div className="text-[26px] font-bold -tracking-[0.02em] mt-[6px] text-accent">
                {format(new Date(`${nextDeadline.date}T00:00:00`), 'EEE MMM d')}
              </div>
              <div className="text-[13.5px] font-medium mt-1">
                {nextDeadline.title} ·{' '}
                {nextDeadline.ownerIds
                  .map((id) => people.find((p) => p.id === id)?.name)
                  .filter(Boolean)
                  .slice(0, 1)
                  .join(', ')}
                {nextDeadline.ownerIds.length > 1 ? ` +${nextDeadline.ownerIds.length - 1}` : ''} · 🔔 reminders on
              </div>
            </div>
          )}
        </div>
        <MonthGrid month={month} events={filteredEvents} projectsById={projectsById} onEventClick={setSelectedEvent} />
      </div>

      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white border-2 border-ink rounded-card shadow-card w-[380px] p-6 flex flex-col gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-bold">
              {selectedEvent.isMilestone ? '◆ ' : ''}
              {selectedEvent.title}
            </div>
            <div className="text-sm text-muted font-medium">
              {projectsById[selectedEvent.project_id]?.name} ·{' '}
              {format(new Date(`${selectedEvent.date}T00:00:00`), 'EEEE, MMM d')}
            </div>
            <div className="text-sm font-medium">
              Owners:{' '}
              {selectedEvent.ownerIds.map((id) => people.find((p) => p.id === id)?.name).filter(Boolean).join(', ') ||
                '—'}
            </div>
            <button
              onClick={() => setSelectedEvent(null)}
              className="mt-3 px-4 py-2 border-2 border-ink rounded-btn font-semibold text-sm bg-white self-end"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
