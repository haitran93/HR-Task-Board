import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { api } from '../lib/api'
import { useCurrentUser } from '../lib/currentUser'
import TopBar from '../components/TopBar'
import WeekStrip from '../components/WeekStrip'
import FilterPills from '../components/FilterPills'
import TaskGroup from '../components/TaskGroup'
import TaskCard from '../components/TaskCard'
import ComingUpPanel from '../components/ComingUpPanel'
import TaskModal from '../components/TaskModal'

export default function MyTasks() {
  const { currentUser, people } = useCurrentUser()
  const queryClient = useQueryClient()
  const [filterProject, setFilterProject] = useState(null)
  const [showDone, setShowDone] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.getProjects })
  const { data: myTasks = [] } = useQuery({
    queryKey: ['tasks', currentUser?.id],
    queryFn: () => api.getTasks({ assigneeId: currentUser.id }),
    enabled: !!currentUser,
  })
  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: () => api.getEvents() })

  const projectsById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects])
  const tasksById = useMemo(() => Object.fromEntries(myTasks.map((t) => [t.id, t])), [myTasks])

  const snooze = useMutation({
    mutationFn: (task) => {
      const d = new Date(`${task.due_date}T00:00:00`)
      d.setDate(d.getDate() + 1)
      return api.updateTask(task.id, { dueDate: format(d, 'yyyy-MM-dd') })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const filtered = filterProject ? myTasks.filter((t) => t.project_id === filterProject) : myTasks
  const open = filtered.filter((t) => t.status === 'open')
  const done = filtered.filter((t) => t.status === 'done')
  const overdue = open.filter((t) => t.overdue)
  const today = open.filter((t) => !t.overdue && t.due_date === format(new Date(), 'yyyy-MM-dd'))
  const thisWeekTasks = open.filter((t) => !t.overdue && t.due_date !== format(new Date(), 'yyyy-MM-dd'))

  const allOpen = myTasks.filter((t) => t.status === 'open')
  const allDone = myTasks.filter((t) => t.status === 'done')
  const allOverdue = allOpen.filter((t) => t.overdue)

  if (!currentUser) return null

  return (
    <div>
      <TopBar onAddTask={() => setShowModal(true)} />
      <div className="grid grid-cols-[1fr_360px] gap-7 px-8 pt-7 pb-9">
        <div className="flex flex-col gap-5">
          <div className="flex items-baseline gap-[14px]">
            <div className="text-[30px] font-bold -tracking-[0.03em]">Hi {currentUser.name} 👋</div>
            <div className="text-sm font-medium text-muted">
              {allOpen.length} doing · {allDone.length} done · {allOverdue.length} overdue
            </div>
          </div>

          <WeekStrip tasks={allOpen} projectsById={projectsById} />

          <FilterPills projects={projects} selected={filterProject} onSelect={setFilterProject} />

          {overdue.length > 0 && (
            <TaskGroup label="OVERDUE" color="#E4572E">
              {overdue.map((t) => (
                <TaskCard key={t.id} task={t} project={projectsById[t.project_id]} onSnooze={(task) => snooze.mutate(task)} />
              ))}
            </TaskGroup>
          )}

          {today.length > 0 && (
            <TaskGroup label={`TODAY · ${format(new Date(), 'EEE MMM d').toUpperCase()}`}>
              {today.map((t) => (
                <TaskCard key={t.id} task={t} project={projectsById[t.project_id]} />
              ))}
            </TaskGroup>
          )}

          {thisWeekTasks.length > 0 && (
            <TaskGroup label="THIS WEEK">
              {thisWeekTasks.map((t) => (
                <TaskCard key={t.id} task={t} project={projectsById[t.project_id]} />
              ))}
            </TaskGroup>
          )}

          {open.length === 0 && <div className="text-sm text-muted">No open tasks — nice work.</div>}

          {done.length > 0 && (
            <div>
              <div
                onClick={() => setShowDone((v) => !v)}
                className="flex gap-4 items-center px-5 py-[14px] border-2 border-dashed border-faded rounded-card text-[#9a927f] cursor-pointer"
              >
                <span className="w-[26px] h-[26px] border-[2.5px] border-[#9a927f] bg-[#9a927f] rounded-chip flex-none text-white text-center leading-[23px] font-bold">
                  ✓
                </span>
                <div className="flex-1 font-semibold text-[15px] line-through">{done[0].title}</div>
                <div className="text-[13px] font-bold">
                  show {done.length} done {showDone ? '▴' : '▾'}
                </div>
              </div>
              {showDone && (
                <div className="flex flex-col gap-2 mt-2">
                  {done.slice(1).map((t) => (
                    <div
                      key={t.id}
                      className="flex gap-4 items-center px-5 py-[10px] border-2 border-dashed border-faded rounded-card text-[#9a927f]"
                    >
                      <span className="w-[22px] h-[22px] border-2 border-[#9a927f] bg-[#9a927f] rounded-chip flex-none text-white text-center leading-[19px] font-bold text-xs">
                        ✓
                      </span>
                      <div className="flex-1 font-semibold text-sm line-through">{t.title}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-[18px]">
          <ComingUpPanel events={events} projectsById={projectsById} people={people} tasksById={tasksById} />
          <a
            href="/brainstorm"
            className="block bg-accent border-2 border-ink rounded-card px-5 py-[18px] shadow-card"
          >
            <div className="font-bold text-base">💡 Brainstorm</div>
            <div className="text-[13.5px] font-medium mt-1">Jot an idea, share it with your team</div>
            <div className="inline-block mt-3 bg-ink text-accent rounded-chip px-4 py-[7px] font-bold text-[13.5px]">
              Open wall →
            </div>
          </a>
        </div>
      </div>
      {showModal && (
        <TaskModal
          projects={projects}
          people={people}
          defaultAssigneeId={currentUser.id}
          allowMemberPick
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
