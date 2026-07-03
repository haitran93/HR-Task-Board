import { startOfWeek, addDays, format, isToday, isWeekend } from 'date-fns'

export default function WeekStrip({ tasks, projectsById }) {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))

  return (
    <div className="grid grid-cols-7 gap-[10px]">
      {days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const today = isToday(day)
        const weekend = isWeekend(day)
        const deadlineTask = tasks.find((t) => t.due_date === dateStr)
        const project = deadlineTask ? projectsById[deadlineTask.project_id] : null

        return (
          <div key={dateStr} className="text-center">
            <div
              className={`text-[11px] font-bold mb-[5px] ${
                today ? 'text-ink' : weekend ? 'text-faded' : 'text-[#9a927f]'
              }`}
            >
              {format(day, 'EEE d').toUpperCase()}
            </div>
            {weekend ? (
              <div className="border-2 border-dashed border-faded rounded-chip h-11" />
            ) : today ? (
              <div
                className="border-2 border-ink rounded-chip h-11 bg-ink flex items-center justify-center gap-[5px]"
                style={{ boxShadow: '3px 3px 0 #E4572E' }}
              >
                <span className="text-accent font-bold text-[13px]">TODAY</span>
                {project && (
                  <span
                    className="w-[10px] h-[10px] rounded-full border-2 border-accent"
                    style={{ background: project.color }}
                  />
                )}
              </div>
            ) : (
              <div className="border-2 border-ink rounded-chip h-11 bg-white flex items-center justify-center">
                {project && (
                  <span
                    className="w-[10px] h-[10px] rounded-full border-2 border-ink"
                    style={{ background: project.color }}
                  />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
