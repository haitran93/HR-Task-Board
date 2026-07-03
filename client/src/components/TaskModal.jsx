import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { api } from '../lib/api'

const ASSIGN_MODES = [
  { id: 'member', label: 'Member' },
  { id: 'function', label: 'Function' },
  { id: 'project', label: 'Project team' },
  { id: 'everyone', label: 'Everyone' },
]

export default function TaskModal({ projects, people, defaultAssigneeId, allowGroupAssign = false, onClose }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [priority, setPriority] = useState('med')
  const [reminderEnabled, setReminderEnabled] = useState(true)

  const [assignMode, setAssignMode] = useState('member')
  const [assigneeId, setAssigneeId] = useState(defaultAssigneeId ?? people[0]?.id ?? '')
  const [functionId, setFunctionId] = useState('')

  const { data: functions = [] } = useQuery({ queryKey: ['functions'], queryFn: api.getFunctions, enabled: allowGroupAssign })
  const { data: personFunctions = [] } = useQuery({
    queryKey: ['personFunctions'],
    queryFn: api.getPersonFunctions,
    enabled: allowGroupAssign,
  })
  const { data: projectTeam = [] } = useQuery({
    queryKey: ['projectTeam', projectId],
    queryFn: () => api.getProjectTeam(projectId),
    enabled: allowGroupAssign && assignMode === 'project' && !!projectId,
  })

  const targetIds = useMemo(() => {
    if (!allowGroupAssign) return assigneeId ? [assigneeId] : []
    if (assignMode === 'member') return assigneeId ? [assigneeId] : []
    if (assignMode === 'function')
      return functionId ? personFunctions.filter((pf) => pf.function_id === functionId).map((pf) => pf.person_id) : []
    if (assignMode === 'project') return projectTeam
    if (assignMode === 'everyone') return people.map((p) => p.id)
    return []
  }, [allowGroupAssign, assignMode, assigneeId, functionId, personFunctions, projectTeam, people])

  const create = useMutation({
    mutationFn: () =>
      api.createTaskBatch({
        title,
        description,
        projectId: projectId || null,
        assigneeIds: targetIds,
        dueDate,
        priority,
        reminderEnabled,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      onClose()
    },
  })

  const canSubmit = title && dueDate && targetIds.length > 0

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white border-2 border-ink rounded-card shadow-card w-[460px] p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xl font-bold -tracking-[0.02em]">{allowGroupAssign ? '+ Assign task' : '+ Task'}</div>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          Title
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-2 border-ink rounded-btn px-3 py-2 font-medium text-sm"
            placeholder="What needs doing?"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          Description (optional)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details or instructions…"
            rows={3}
            className="border-2 border-ink rounded-btn px-3 py-2 font-medium text-sm resize-none"
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
            Due date
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="border-2 border-ink rounded-btn px-2 py-2 font-medium text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold">
            Priority
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="border-2 border-ink rounded-btn px-2 py-2 font-medium text-sm"
            >
              <option value="low">Low</option>
              <option value="med">Med</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>

        {allowGroupAssign && (
          <div className="flex flex-col gap-2">
            <div className="text-sm font-semibold">Assign to</div>
            <div className="flex gap-2 flex-wrap">
              {ASSIGN_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setAssignMode(m.id)}
                  className={[
                    'text-xs font-bold border-2 border-ink rounded-pill px-3 py-[6px]',
                    assignMode === m.id ? 'bg-ink text-bg' : 'bg-white',
                  ].join(' ')}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {assignMode === 'member' && (
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="border-2 border-ink rounded-btn px-2 py-2 font-medium text-sm"
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            {assignMode === 'function' && (
              <select
                value={functionId}
                onChange={(e) => setFunctionId(e.target.value)}
                className="border-2 border-ink rounded-btn px-2 py-2 font-medium text-sm"
              >
                <option value="">Select a function…</option>
                {functions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}

            {assignMode === 'project' && !projectId && (
              <div className="text-xs text-muted font-medium">Pick a project above to target its team.</div>
            )}

            <div className="text-xs text-muted font-medium">
              {targetIds.length > 0
                ? `Will create ${targetIds.length} task${targetIds.length > 1 ? 's' : ''} (one per person).`
                : 'No one targeted yet.'}
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={reminderEnabled} onChange={(e) => setReminderEnabled(e.target.checked)} />
          Reminder enabled
        </label>

        <div className="flex gap-2 justify-end mt-2">
          <button onClick={onClose} className="px-4 py-2 border-2 border-ink rounded-btn font-semibold text-sm bg-white">
            Cancel
          </button>
          <button
            disabled={!canSubmit || create.isPending}
            onClick={() => create.mutate()}
            className="hard-btn px-4 py-2 border-2 border-ink rounded-btn font-bold text-sm bg-accent shadow-btn disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
