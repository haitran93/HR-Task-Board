import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { api } from '../lib/api'

export default function ComingUpPanel({ events, projectsById, people, tasksById = {} }) {
  const queryClient = useQueryClient()
  const upcoming = events
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)

  const toggleReminder = useMutation({
    mutationFn: ({ taskId, enabled }) => api.updateTask(taskId, { reminderEnabled: enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  return (
    <div className="bg-white border-2 border-ink rounded-card px-5 py-[18px]">
      <div className="font-bold text-base mb-[14px]">Coming up ⏰</div>
      <div className="flex flex-col gap-[10px]">
        {upcoming.map((e) => {
          const project = projectsById[e.project_id]
          const owners = e.ownerIds.map((id) => people.find((p) => p.id === id)?.name).filter(Boolean)
          const reminderOn = !!tasksById[e.linkedTaskId]?.reminderEnabled
          return (
            <div
              key={e.id}
              className="flex gap-[10px] items-center border-2 border-ink rounded-btn px-3 py-[10px]"
              style={e.date === upcoming[0]?.date ? { background: '#FDF0D0' } : undefined}
            >
              <span className="w-[10px] h-[10px] rounded-full flex-none" style={{ background: project?.color }} />
              <div className="flex-1 text-[13.5px] font-semibold">
                {e.title}
                <div className="font-medium text-muted text-xs">
                  {format(parseISO(e.date), 'EEE MMM d')}
                  {owners.length ? ` · ${owners.slice(0, 2).join(', ')}${owners.length > 2 ? ` +${owners.length - 2}` : ''}` : ''}
                </div>
              </div>
              <button
                disabled={!e.linkedTaskId}
                onClick={() => e.linkedTaskId && toggleReminder.mutate({ taskId: e.linkedTaskId, enabled: !reminderOn })}
                className={`text-sm ${e.linkedTaskId ? '' : 'opacity-35 cursor-default'} ${reminderOn ? '' : 'opacity-35'}`}
              >
                {reminderOn ? '🔔' : '🔕'}
              </button>
            </div>
          )
        })}
        {upcoming.length === 0 && <div className="text-sm text-muted">No upcoming deadlines.</div>}
      </div>
    </div>
  )
}
