import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useCurrentUser } from '../lib/currentUser'
import PersonColumn from '../components/PersonColumn'
import MiniTaskCard from '../components/MiniTaskCard'
import TaskModal from '../components/TaskModal'

const TABS = ['By person', 'By project', 'Projects', 'Reminder rules']

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function AdminBoard() {
  const navigate = useNavigate()
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

      {tab === 'Projects' && <ProjectsAdmin projects={projects} people={people} />}

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

  function toggleMember(personId) {
    const next = team.includes(personId) ? team.filter((id) => id !== personId) : [...team, personId]
    saveTeam.mutate(next)
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
          return (
            <div key={project.id} className="bg-white border-2 border-ink rounded-card p-4">
              <div
                className="flex items-center gap-[10px] cursor-pointer"
                onClick={() => setOpenProjectId(isOpen ? null : project.id)}
              >
                <span className="w-4 h-4 border-2 border-ink rounded-[5px]" style={{ background: project.color }} />
                <b className="text-[15px] flex-1">{project.name}</b>
                <span className="text-xs font-semibold text-muted">{isOpen ? 'hide team ▴' : 'manage team ▾'}</span>
              </div>
              {isOpen && (
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
