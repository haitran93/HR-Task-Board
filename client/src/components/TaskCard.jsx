import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO, isToday } from 'date-fns'
import { api } from '../lib/api'
import { useCurrentUser } from '../lib/currentUser'
import CompletionChannelPicker from './CompletionChannelPicker'

const PRIORITY_STYLE = {
  high: 'bg-program-retreat text-white border-ink',
  med: 'bg-accent text-ink border-ink',
  low: 'bg-white text-muted border-faded',
}

function formatDue(dueDate, overdue) {
  const d = parseISO(dueDate)
  if (overdue) return `Overdue · ${format(d, 'MMM d')}`
  if (isToday(d)) return 'due today'
  return format(d, 'EEE MMM d')
}

export default function TaskCard({ task, project, onSnooze }) {
  const { currentUser } = useCurrentUser()
  const queryClient = useQueryClient()
  const [pickerOpen, setPickerOpen] = useState(false)

  const reopen = useMutation({
    mutationFn: () =>
      api.updateTask(task.id, {
        status: 'open',
        completionChannel: null,
        completionNote: null,
        completedBy: null,
        completedAt: null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const complete = useMutation({
    mutationFn: ({ channel, note }) =>
      api.updateTask(task.id, {
        status: 'done',
        completionChannel: channel,
        completionNote: note || null,
        completedBy: currentUser.id,
        completedAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setPickerOpen(false)
    },
  })

  const overdue = task.overdue

  function handleCheckboxClick() {
    if (task.status === 'done') {
      reopen.mutate()
    } else {
      setPickerOpen(true)
    }
  }

  return (
    <div
      className={[
        'flex overflow-hidden rounded-card border-2 relative',
        overdue ? 'bg-overdueTint border-program-retreat' : 'bg-white border-ink shadow-card',
      ].join(' ')}
    >
      <div className="w-3 flex-none" style={{ background: overdue ? '#E4572E' : project?.color }} />
      <div className="flex gap-4 items-center px-5 py-4 flex-1">
        <div className="relative">
          <button
            onClick={handleCheckboxClick}
            className={[
              'w-[26px] h-[26px] rounded-chip flex-none bg-white hover:bg-accent transition-colors',
              overdue ? 'border-[2.5px] border-program-retreat' : 'border-[2.5px] border-ink',
            ].join(' ')}
            aria-label="Toggle done"
          />
          {pickerOpen && (
            <CompletionChannelPicker
              onSubmit={(channel, note) => complete.mutate({ channel, note })}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>
        <div className="flex-1">
          <div className="font-bold text-base">{task.title}</div>
          <div className={`text-[13px] font-medium mt-[3px] ${overdue ? 'font-bold text-program-retreat' : 'text-muted'}`}>
            {project?.name} · {formatDue(task.due_date, overdue)}
            {task.note ? ` · ${task.note}` : ''}
            {!overdue && task.reminderEnabled ? ' · 🔔' : ''}
          </div>
        </div>
        {overdue ? (
          <button
            onClick={() => onSnooze?.(task)}
            className="hard-btn-red text-xs font-bold border-2 border-program-retreat text-program-retreat rounded-chip px-3 py-1 bg-white hover:bg-program-retreat hover:text-white transition-colors"
          >
            Snooze
          </button>
        ) : (
          <span className={`text-xs font-bold border-2 rounded-chip px-3 py-1 ${PRIORITY_STYLE[task.priority]}`}>
            {task.priority === 'high' ? 'HIGH' : task.priority === 'low' ? 'LOW' : 'MED'}
          </span>
        )}
      </div>
    </div>
  )
}
