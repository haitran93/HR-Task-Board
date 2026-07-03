import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export default function EventModal({ projects, people, event, onClose }) {
  const queryClient = useQueryClient()
  const isEdit = !!event
  const [title, setTitle] = useState(event?.title ?? '')
  const [projectId, setProjectId] = useState(event?.project_id ?? '')
  const [date, setDate] = useState(event?.date ?? '')
  const [isMilestone, setIsMilestone] = useState(event?.isMilestone ?? false)
  const [ownerIds, setOwnerIds] = useState(event?.ownerIds ?? [])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['events'] })
    onClose()
  }

  const save = useMutation({
    mutationFn: () =>
      isEdit
        ? api.updateEvent(event.id, { title, projectId: projectId || null, date, isMilestone, ownerIds })
        : api.createEvent({ title, projectId: projectId || null, date, isMilestone, ownerIds }),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: () => api.deleteEvent(event.id),
    onSuccess: invalidate,
  })

  function toggleOwner(id) {
    setOwnerIds((cur) => (cur.includes(id) ? cur.filter((o) => o !== id) : [...cur, id]))
  }

  const canSubmit = title && date

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white border-2 border-ink rounded-card shadow-card w-[420px] p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xl font-bold -tracking-[0.02em]">{isEdit ? 'Edit event' : '+ Event'}</div>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          Title
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Launch date"
            className="border-2 border-ink rounded-btn px-3 py-2 font-medium text-sm"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Project
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="border-2 border-ink rounded-btn px-2 py-2 font-medium text-sm"
            >
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-2 border-ink rounded-btn px-2 py-2 font-medium text-sm"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={isMilestone} onChange={(e) => setIsMilestone(e.target.checked)} />
          Milestone (shows with a ◆ marker)
        </label>

        <div>
          <div className="text-sm font-semibold mb-2">Owners</div>
          <div className="flex flex-wrap gap-2">
            {people.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleOwner(p.id)}
                className={[
                  'text-xs font-semibold border-2 border-ink rounded-pill px-3 py-[6px]',
                  ownerIds.includes(p.id) ? 'bg-ink text-bg' : 'bg-white',
                ].join(' ')}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-between mt-2">
          {isEdit ? (
            <button
              onClick={() => {
                if (window.confirm(`Delete "${event.title}"? This can't be undone.`)) remove.mutate()
              }}
              className="text-sm font-semibold border-2 border-program-retreat text-program-retreat rounded-btn px-4 py-2 bg-white"
            >
              Delete
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 border-2 border-ink rounded-btn font-semibold text-sm bg-white">
              Cancel
            </button>
            <button
              disabled={!canSubmit || save.isPending}
              onClick={() => save.mutate()}
              className="hard-btn px-4 py-2 border-2 border-ink rounded-btn font-bold text-sm bg-accent shadow-btn disabled:opacity-50"
            >
              {isEdit ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
