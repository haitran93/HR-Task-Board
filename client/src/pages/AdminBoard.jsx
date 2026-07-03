import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { api } from '../lib/api'
import { useCurrentUser } from '../lib/currentUser'
import PersonColumn from '../components/PersonColumn'
import MiniTaskCard from '../components/MiniTaskCard'
import TaskModal from '../components/TaskModal'
import TaskDetailModal from '../components/TaskDetailModal'

const TABS = ['By person', 'By project', 'Tasks', 'Projects', 'Members', 'Reminder rules']

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function AdminBoard() {
  const navigate = useNavigate()
  const { currentUser } = useCurrentUser()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('By person')
  const [selectedPersonId, setSelectedPersonId] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const { data: people = [] } = useQuery({ queryKey: ['people'], queryFn: api.getPeople })
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.getProjects })
  const { data: allOpenTasks = [] } = useQuery({
    queryKey: ['tasks', 'admin-open'],
    queryFn: () => api.getTasks({ status: 'open' }),
  })
  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks', 'admin-all'],
    queryFn: () => api.getTasks({}),
    enabled: tab === 'Tasks',
  })
  const { data: reminderRules = [] } = useQuery({ queryKey: ['reminderRules'], queryFn: api.getReminderRules })

  const projectsById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects])

  const peopleWithCounts = useMemo(() => {
    const today = todayStr()
    return people.map((p) => {
      const mine = allOpenTasks.filter((t) => t.assignee_id === p.id)
      const overdueCount = mine.filter((t) => t.due_date < today).length
      return { ...p, openCount: mine.length, overdueCount, overloaded: mine.length > 8 || overdueCount > 0 }
    })
  }, [people, allOpenTasks])

  const reassign = useMutation({
    mutationFn: ({ taskId, assigneeId }) => api.updateTask(taskId, { assigneeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const updateRule = useMutation({
    mutationFn: ({ projectId, data }) => api.updateReminderRule(projectId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminderRules'] }),
  })

  const visiblePeople = selectedPersonId ? peopleWithCounts.filter((p) => p.id === selectedPersonId) : peopleWithCounts
  const shownChips = peopleWithCounts.slice(0, 6)
  const overflowCount = Math.max(peopleWithCounts.length - shownChips.length, 0)

  return (
    <div>
      <div className="flex items-center gap-6 px-8 py-[18px] border-b-2 border-ink bg-ink">
        <div className="flex items-center gap-[10px]">
          <div className="w-[34px] h-[34px] bg-accent rounded-chip flex items-center justify-center text-ink font-bold text-base">
            H
          </div>
          <div className="font-bold text-[17px] -tracking-[0.02em] text-bg">
            HR Hub{' '}
            <span className="text-[11px] bg-accent text-ink rounded px-2 py-[2px] align-middle ml-[6px]">ADMIN</span>
          </div>
        </div>
        <div className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'px-[18px] py-2 rounded-btn font-semibold text-sm border-2',
                tab === t ? 'bg-accent text-ink border-accent font-bold' : 'bg-transparent border-[#4a4a4a] text-faded',
              ].join(' ')}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="px-[18px] py-2 bg-bg border-2 border-bg rounded-btn font-bold text-sm"
          >
            + Assign task
          </button>
          <button onClick={() => navigate('/')} className="text-[13px] font-medium text-faded">
            exit admin ✕
          </button>
        </div>
      </div>

      {(tab === 'By person' || tab === 'By project') && (
        <div className="px-8 pt-6 pb-2 flex gap-2 flex-wrap items-center">
          {shownChips.map((p) => (
            <span
              key={p.id}
              onClick={() => setSelectedPersonId((cur) => (cur === p.id ? null : p.id))}
              className={[
                'text-[13px] font-semibold border-2 rounded-[20px] px-[15px] py-[5px] cursor-pointer',
                selectedPersonId === p.id ? 'bg-ink text-bg border-ink' : '',
                selectedPersonId !== p.id && p.overloaded
                  ? 'border-program-retreat text-program-retreat bg-overdueTint'
                  : '',
                selectedPersonId !== p.id && !p.overloaded ? 'border-ink bg-white' : '',
              ].join(' ')}
            >
              {p.name} · {p.openCount}
              {p.overloaded ? ' ⚠' : ''}
            </span>
          ))}
          {overflowCount > 0 && <span className="text-[13px] font-semibold text-muted px-2">+{overflowCount} more</span>}
          <span className="ml-auto text-[12.5px] font-medium text-muted">
            ⚠ = overloaded or has overdue · drag a card between columns to reassign
          </span>
        </div>
      )}

      {tab === 'By person' && (
        <div className="grid grid-cols-4 gap-[18px] px-8 pt-5 pb-9">
          {visiblePeople.map((person) => (
            <PersonColumn
              key={person.id}
              person={person}
              tasks={allOpenTasks.filter((t) => t.assignee_id === person.id)}
              projectsById={projectsById}
              onDropTask={(taskId, assigneeId) => reassign.mutate({ taskId, assigneeId })}
            />
          ))}
        </div>
      )}

      {tab === 'By project' && (
        <div className="grid grid-cols-4 gap-[18px] px-8 pt-5 pb-9">
          {projects.map((project) => (
            <div key={project.id} className="bg-white border-2 border-ink rounded-card p-4">
              <div className="flex items-center gap-[9px] mb-[14px]">
                <span className="w-4 h-4 border-2 border-ink rounded-[5px]" style={{ background: project.color }} />
                <b className="text-[15px]">{project.name}</b>
                <span className="ml-auto text-xs font-bold text-muted">
                  {allOpenTasks.filter((t) => t.project_id === project.id).length}
                </span>
              </div>
              <div className="flex flex-col gap-[9px]">
                {allOpenTasks
                  .filter((t) => t.project_id === project.id)
                  .map((t) => (
                    <div key={t.id}>
                      <MiniTaskCard task={t} project={project} />
                      <div className="text-[11px] font-semibold text-muted mt-1 ml-1">
                        {people.find((p) => p.id === t.assignee_id)?.name}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Tasks' && <TasksAdmin tasks={allTasks} people={people} projects={projects} projectsById={projectsById} />}

      {tab === 'Projects' && <ProjectsAdmin projects={projects} people={people} />}

      {tab === 'Members' && <MembersAdmin people={people} currentUserId={currentUser.id} />}

      {tab === 'Reminder rules' && (
        <div className="px-8 pt-6 pb-9 max-w-2xl">
          <div className="bg-white border-2 border-ink rounded-card overflow-hidden">
            <div className="grid grid-cols-[1fr_140px_140px] bg-bg border-b-2 border-ink text-xs font-bold tracking-[0.1em] text-muted px-5 py-3">
              <div>PROJECT</div>
              <div>OFFSET DAYS</div>
              <div>MORNING-OF</div>
            </div>
            {reminderRules.map((rule) => {
              const project = projectsById[rule.project_id]
              return (
                <div
                  key={rule.project_id}
                  className="grid grid-cols-[1fr_140px_140px] items-center px-5 py-3 border-b border-subtleBorder last:border-b-0"
                >
                  <div className="flex items-center gap-[10px] font-semibold text-sm">
                    <span className="w-4 h-4 border-2 border-ink rounded-[5px]" style={{ background: project?.color }} />
                    {project?.name}
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={14}
                    value={rule.offset_days}
                    onChange={(e) =>
                      updateRule.mutate({ projectId: rule.project_id, data: { offsetDays: Number(e.target.value) } })
                    }
                    className="border-2 border-ink rounded-btn px-2 py-1 text-sm font-medium w-20"
                  />
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={!!rule.morning_of}
                      onChange={(e) =>
                        updateRule.mutate({ projectId: rule.project_id, data: { morningOf: e.target.checked } })
                      }
                    />
                    enabled
                  </label>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showModal && (
        <TaskModal projects={projects} people={people} allowGroupAssign onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}

function ProjectsAdmin({ projects, people }) {
  const queryClient = useQueryClient()
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#2E5FE4')
  const [openProjectId, setOpenProjectId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#000000')

  const { data: team = [] } = useQuery({
    queryKey: ['projectTeam', openProjectId],
    queryFn: () => api.getProjectTeam(openProjectId),
    enabled: !!openProjectId,
  })

  const createProject = useMutation({
    mutationFn: () => api.createProject({ name: newName, color: newColor }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setNewName('')
    },
  })

  const saveTeam = useMutation({
    mutationFn: (personIds) => api.setProjectTeam(openProjectId, personIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projectTeam', openProjectId] }),
  })

  const saveEdit = useMutation({
    mutationFn: ({ id, name, color }) => api.updateProject(id, { name, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setEditingId(null)
    },
  })

  const removeProject = useMutation({
    mutationFn: (id) => api.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['reminderRules'] })
    },
  })

  function toggleMember(personId) {
    const next = team.includes(personId) ? team.filter((id) => id !== personId) : [...team, personId]
    saveTeam.mutate(next)
  }

  function startEdit(project) {
    setEditingId(project.id)
    setEditName(project.name)
    setEditColor(project.color)
  }

  async function confirmDelete(project) {
    const impact = await api.getProjectImpact(project.id)
    const parts = []
    if (impact.taskCount) parts.push(`${impact.taskCount} task(s) will be unassigned from it (kept, just untagged)`)
    if (impact.eventCount) parts.push(`${impact.eventCount} calendar event(s) will be permanently deleted`)
    const message = parts.length
      ? `Delete "${project.name}"?\n\n${parts.join('\n')}`
      : `Delete "${project.name}"? Nothing else references it.`
    if (window.confirm(message)) removeProject.mutate(project.id)
  }

  return (
    <div className="px-8 pt-6 pb-9 max-w-3xl flex flex-col gap-5">
      <div className="bg-white border-2 border-ink rounded-card p-5 flex flex-col gap-3">
        <div className="font-bold text-base">New project</div>
        <div className="flex gap-3 items-end">
          <label className="flex flex-col gap-1 text-sm font-semibold flex-1">
            Name
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Wellbeing Week"
              className="border-2 border-ink rounded-btn px-3 py-2 font-medium text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Color
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="border-2 border-ink rounded-btn h-[38px] w-[52px] p-1"
            />
          </label>
          <button
            disabled={!newName || createProject.isPending}
            onClick={() => createProject.mutate()}
            className="hard-btn px-4 py-2 border-2 border-ink rounded-btn font-bold text-sm bg-accent shadow-btn disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {projects.map((project) => {
          const isOpen = openProjectId === project.id
          const isEditing = editingId === project.id
          return (
            <div key={project.id} className="bg-white border-2 border-ink rounded-card p-4">
              {isEditing ? (
                <div className="flex gap-3 items-end">
                  <label className="flex flex-col gap-1 text-sm font-semibold flex-1">
                    Name
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="border-2 border-ink rounded-btn px-3 py-2 font-medium text-sm"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-semibold">
                    Color
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="border-2 border-ink rounded-btn h-[38px] w-[52px] p-1"
                    />
                  </label>
                  <button
                    disabled={!editName || saveEdit.isPending}
                    onClick={() => saveEdit.mutate({ id: project.id, name: editName, color: editColor })}
                    className="hard-btn px-4 py-2 border-2 border-ink rounded-btn font-bold text-sm bg-accent shadow-btn disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 border-2 border-ink rounded-btn font-semibold text-sm bg-white"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-[10px]">
                  <span
                    onClick={() => setOpenProjectId(isOpen ? null : project.id)}
                    className="w-4 h-4 border-2 border-ink rounded-[5px] cursor-pointer"
                    style={{ background: project.color }}
                  />
                  <b onClick={() => setOpenProjectId(isOpen ? null : project.id)} className="text-[15px] flex-1 cursor-pointer">
                    {project.name}
                  </b>
                  <span
                    onClick={() => setOpenProjectId(isOpen ? null : project.id)}
                    className="text-xs font-semibold text-muted cursor-pointer"
                  >
                    {isOpen ? 'hide team ▴' : 'manage team ▾'}
                  </span>
                  <button onClick={() => startEdit(project)} className="text-xs font-semibold border-2 border-ink rounded-btn px-2 py-1 bg-white">
                    edit
                  </button>
                  <button
                    onClick={() => confirmDelete(project)}
                    className="text-xs font-semibold border-2 border-program-retreat text-program-retreat rounded-btn px-2 py-1 bg-white"
                  >
                    delete
                  </button>
                </div>
              )}
              {isOpen && !isEditing && (
                <div className="mt-3 pt-3 border-t-2 border-dashed border-faded flex flex-wrap gap-2">
                  {people.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => toggleMember(p.id)}
                      className={[
                        'text-xs font-semibold border-2 border-ink rounded-pill px-3 py-[6px]',
                        team.includes(p.id) ? 'bg-ink text-bg' : 'bg-white',
                      ].join(' ')}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MembersAdmin({ people, currentUserId }) {
  const queryClient = useQueryClient()
  const [openPersonId, setOpenPersonId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#000000')
  const [editIsAdmin, setEditIsAdmin] = useState(false)

  const { data: functions = [] } = useQuery({ queryKey: ['functions'], queryFn: api.getFunctions })
  const { data: personFunctions = [] } = useQuery({ queryKey: ['personFunctions'], queryFn: api.getPersonFunctions })

  const myFunctionIds = (personId) => personFunctions.filter((pf) => pf.person_id === personId).map((pf) => pf.function_id)

  const saveEdit = useMutation({
    mutationFn: ({ id, name, avatarColor, isAdmin }) => api.updatePerson(id, { name, avatarColor, isAdmin }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['people'] }),
  })

  const saveFunctions = useMutation({
    mutationFn: ({ personId, functionIds }) => api.setPersonFunctions(personId, functionIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['personFunctions'] }),
  })

  const removePerson = useMutation({
    mutationFn: (id) => api.deletePerson(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['ideas'] })
      setOpenPersonId(null)
    },
  })

  function open(person) {
    setOpenPersonId(openPersonId === person.id ? null : person.id)
    setEditName(person.name)
    setEditColor(person.avatar_color)
    setEditIsAdmin(person.isAdmin)
  }

  function toggleFunction(personId, functionId) {
    const current = myFunctionIds(personId)
    const next = current.includes(functionId) ? current.filter((id) => id !== functionId) : [...current, functionId]
    saveFunctions.mutate({ personId, functionIds: next })
  }

  async function confirmDelete(person) {
    const impact = await api.getPersonImpact(person.id)
    const parts = []
    if (impact.taskCount) parts.push(`${impact.taskCount} task(s) assigned to them will be permanently deleted`)
    if (impact.ideaCount) parts.push(`${impact.ideaCount} brainstorm idea(s) they wrote will be permanently deleted`)
    const message = parts.length
      ? `Remove ${person.name}?\n\n${parts.join('\n')}\n\nNote: this only removes their app data — their login account isn't deleted, so they could still sign in but wouldn't see anything until re-added.`
      : `Remove ${person.name}? Nothing else references them.`
    if (window.confirm(message)) removePerson.mutate(person.id)
  }

  return (
    <div className="px-8 pt-6 pb-9 max-w-3xl flex flex-col gap-3">
      {people.map((person) => {
        const isOpen = openPersonId === person.id
        const isSelf = person.id === currentUserId
        return (
          <div key={person.id} className="bg-white border-2 border-ink rounded-card p-4">
            <div className="flex items-center gap-[10px] cursor-pointer" onClick={() => open(person)}>
              <span
                className="w-8 h-8 text-white border-2 border-ink rounded-chip flex items-center justify-center font-bold text-sm"
                style={{ background: person.avatar_color }}
              >
                {person.name[0]}
              </span>
              <b className="text-[15px] flex-1">
                {person.name} {person.isAdmin ? <span className="text-xs font-bold text-muted">ADMIN</span> : null}
              </b>
              <span className="text-xs font-semibold text-muted">{isOpen ? 'hide ▴' : 'edit ▾'}</span>
            </div>

            {isOpen && (
              <div className="mt-3 pt-3 border-t-2 border-dashed border-faded flex flex-col gap-3">
                <div className="flex gap-3 items-end">
                  <label className="flex flex-col gap-1 text-sm font-semibold flex-1">
                    Name
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="border-2 border-ink rounded-btn px-3 py-2 font-medium text-sm"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-semibold">
                    Avatar color
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="border-2 border-ink rounded-btn h-[38px] w-[52px] p-1"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold pb-2">
                    <input
                      type="checkbox"
                      checked={editIsAdmin}
                      disabled={isSelf}
                      onChange={(e) => setEditIsAdmin(e.target.checked)}
                    />
                    Admin{isSelf ? ' (can’t change your own)' : ''}
                  </label>
                  <button
                    disabled={!editName || saveEdit.isPending}
                    onClick={() =>
                      saveEdit.mutate({ id: person.id, name: editName, avatarColor: editColor, isAdmin: editIsAdmin })
                    }
                    className="hard-btn px-4 py-2 border-2 border-ink rounded-btn font-bold text-sm bg-accent shadow-btn disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>

                <div>
                  <div className="text-xs font-bold tracking-[0.08em] text-muted mb-2">FUNCTIONS</div>
                  <div className="flex flex-wrap gap-2">
                    {functions.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => toggleFunction(person.id, f.id)}
                        className={[
                          'text-xs font-semibold border-2 border-ink rounded-pill px-3 py-[6px]',
                          myFunctionIds(person.id).includes(f.id) ? 'bg-ink text-bg' : 'bg-white',
                        ].join(' ')}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>

                {!isSelf && (
                  <button
                    onClick={() => confirmDelete(person)}
                    className="self-start text-xs font-semibold border-2 border-program-retreat text-program-retreat rounded-btn px-3 py-[6px] bg-white"
                  >
                    Remove {person.name}
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TasksAdmin({ tasks, people, projects, projectsById }) {
  const queryClient = useQueryClient()
  const [editingKey, setEditingKey] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editProjectId, setEditProjectId] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editPriority, setEditPriority] = useState('med')
  const [detailTask, setDetailTask] = useState(null)

  const peopleById = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people])

  const groups = useMemo(() => {
    const byKey = {}
    tasks.forEach((t) => {
      const key = t.batch_id || t.id
      ;(byKey[key] = byKey[key] || []).push(t)
    })
    return Object.entries(byKey)
      .map(([key, rows]) => ({ key, rows: rows.slice().sort((a, b) => (peopleById[a.assignee_id]?.name ?? '').localeCompare(peopleById[b.assignee_id]?.name ?? '')) }))
      .sort((a, b) => b.rows[0].due_date.localeCompare(a.rows[0].due_date))
  }, [tasks, peopleById])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
    queryClient.invalidateQueries({ queryKey: ['people'] })
    setEditingKey(null)
  }

  const saveEdit = useMutation({
    mutationFn: (ids) =>
      api.updateTasksBulk(ids, { title: editTitle, projectId: editProjectId || null, dueDate: editDueDate, priority: editPriority }),
    onSuccess: invalidate,
  })

  const revokeOne = useMutation({
    mutationFn: (taskId) => api.deleteTask(taskId),
    onSuccess: invalidate,
  })

  const deleteGroup = useMutation({
    mutationFn: (ids) => api.deleteTasksBulk(ids),
    onSuccess: invalidate,
  })

  function startEdit(group) {
    const first = group.rows[0]
    setEditingKey(group.key)
    setEditTitle(first.title)
    setEditProjectId(first.project_id ?? '')
    setEditDueDate(first.due_date)
    setEditPriority(first.priority)
  }

  function confirmRevoke(task) {
    const name = peopleById[task.assignee_id]?.name ?? 'this person'
    if (window.confirm(`Remove "${task.title}" from ${name} only? Everyone else keeps it.`)) revokeOne.mutate(task.id)
  }

  function confirmDeleteGroup(group) {
    const count = group.rows.length
    const message =
      count > 1
        ? `Delete "${group.rows[0].title}" for all ${count} people it's assigned to?`
        : `Delete "${group.rows[0].title}"?`
    if (window.confirm(message)) deleteGroup.mutate(group.rows.map((r) => r.id))
  }

  return (
    <div className="px-8 pt-6 pb-9 max-w-4xl flex flex-col gap-3">
      {groups.length === 0 && <div className="text-sm text-muted">No tasks yet.</div>}
      {groups.map((group) => {
        const first = group.rows[0]
        const isEditing = editingKey === group.key
        const project = projectsById[first.project_id]
        return (
          <div key={group.key} className="bg-white border-2 border-ink rounded-card p-4">
            {isEditing ? (
              <div className="flex flex-wrap gap-3 items-end">
                <label className="flex flex-col gap-1 text-sm font-semibold flex-1 min-w-[160px]">
                  Title
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="border-2 border-ink rounded-btn px-3 py-2 font-medium text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-semibold">
                  Project
                  <select
                    value={editProjectId}
                    onChange={(e) => setEditProjectId(e.target.value)}
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
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="border-2 border-ink rounded-btn px-2 py-2 font-medium text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-semibold">
                  Priority
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="border-2 border-ink rounded-btn px-2 py-2 font-medium text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="med">Med</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <button
                  disabled={!editTitle || saveEdit.isPending}
                  onClick={() => saveEdit.mutate(group.rows.map((r) => r.id))}
                  className="hard-btn px-4 py-2 border-2 border-ink rounded-btn font-bold text-sm bg-accent shadow-btn disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingKey(null)}
                  className="px-4 py-2 border-2 border-ink rounded-btn font-semibold text-sm bg-white"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-[10px]">
                  <span className="w-4 h-4 border-2 border-ink rounded-[5px] flex-none" style={{ background: project?.color ?? '#ccc' }} />
                  <b className="text-[15px] flex-1">{first.title}</b>
                  <span className="text-xs font-semibold text-muted">
                    {project?.name ?? 'No project'} · {format(new Date(`${first.due_date}T00:00:00`), 'MMM d')} ·{' '}
                    {group.rows.length} {group.rows.length === 1 ? 'person' : 'people'}
                  </span>
                  <button onClick={() => startEdit(group)} className="text-xs font-semibold border-2 border-ink rounded-btn px-2 py-1 bg-white">
                    edit
                  </button>
                  <button
                    onClick={() => confirmDeleteGroup(group)}
                    className="text-xs font-semibold border-2 border-program-retreat text-program-retreat rounded-btn px-2 py-1 bg-white"
                  >
                    {group.rows.length > 1 ? 'delete for everyone' : 'delete'}
                  </button>
                </div>
                <div className="mt-3 pt-3 border-t-2 border-dashed border-faded flex flex-col gap-2">
                  {group.rows.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 text-sm">
                      <span
                        className="w-5 h-5 text-white border border-ink rounded flex items-center justify-center font-bold text-[10px] flex-none"
                        style={{ background: peopleById[t.assignee_id]?.avatar_color }}
                      >
                        {peopleById[t.assignee_id]?.name[0]}
                      </span>
                      <span className="font-semibold flex-1">{peopleById[t.assignee_id]?.name}</span>
                      <span
                        className={`text-xs font-bold ${
                          t.status === 'done' ? 'text-program-training' : t.overdue ? 'text-program-retreat' : 'text-muted'
                        }`}
                      >
                        {t.status === 'done' ? 'done' : t.overdue ? 'overdue' : 'open'}
                      </span>
                      <button
                        onClick={() => setDetailTask(t)}
                        className="text-xs font-semibold border-2 border-ink rounded-btn px-2 py-[2px] bg-white"
                      >
                        details
                      </button>
                      {group.rows.length > 1 && (
                        <button
                          onClick={() => confirmRevoke(t)}
                          className="text-xs font-semibold border-2 border-ink rounded-btn px-2 py-[2px] bg-white"
                        >
                          revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )
      })}
      {detailTask && (
        <TaskDetailModal task={detailTask} project={projectsById[detailTask.project_id]} onClose={() => setDetailTask(null)} />
      )}
    </div>
  )
}
