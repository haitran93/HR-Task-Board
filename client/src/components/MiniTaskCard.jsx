import { format, parseISO, isToday } from 'date-fns'

function metaLabel(task, project) {
  const d = parseISO(task.due_date)
  const when = task.overdue ? `Overdue ${format(d, 'MMM d')}` : isToday(d) ? 'today' : format(d, 'EEE d')
  return `${project?.name ?? ''} · ${when}${task.reminderEnabled && !task.overdue ? ' · 🔔' : ''}`
}

export default function MiniTaskCard({ task, project, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id)
        onDragStart?.(task)
      }}
      className={[
        'rounded-chip px-3 py-[9px] flex flex-col gap-[3px] cursor-grab',
        task.overdue
          ? 'border-2 border-program-retreat bg-overdueTint'
          : 'border-2 border-ink bg-white shadow-btn',
      ].join(' ')}
    >
      <div className="font-semibold text-[13.5px]">{task.title}</div>
      <div
        className={`text-[11.5px] font-semibold ${task.overdue ? 'text-program-retreat font-bold' : ''}`}
        style={!task.overdue ? { color: project?.color } : undefined}
      >
        {metaLabel(task, project)}
      </div>
    </div>
  )
}
