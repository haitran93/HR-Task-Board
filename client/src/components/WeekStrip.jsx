import { startOfWeek, addDays, format, isToday, isWeekend } from 'date-fns'

export default function WeekStrip({ openTasks, doneTasks, projectsById }) {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 })
  const days = Array.from({ length: 14 }, (_, i) => addDays(start, i))

  return (
    <div className="grid grid-cols-7 gap-x-[10px] gap-y-[16px]">
      {days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const today = isToday(day)
        const weekend = isWeekend(day)
        const dueTasks = openTasks.filter((t) => t.due_date === dateStr)
        const doneToday = doneTasks.filter((t) => t.completed_at?.slice(0, 10) === dateStr)
        const dueCount = dueTasks.length
        const doneCount = doneToday.length
        const accentColor = projectsById[dueTasks[0]?.project_id]?.color ?? '#6F6A60'

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
              <div className="border-2 border-dashed border-faded rounded-chip h-14" />
            ) : (
              <div
                className="relative border-2 border-ink rounded-chip h-14 bg-white flex items-center justify-center overflow-hidden"
                style={today ? { boxShadow: '3px 3px 0 #E4572E' } : undefined}
              >
                {dueCount > 0 && (
                  <>
                    <span className="font-bold text-lg" style={{ color: accentColor }}>
                      {dueCount}
                    </span>
                    <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: accentColor }} />
                  </>
                )}
                {doneCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-program-training text-white text-[9px] font-bold flex items-center justify-center">
                    {doneCount}
                  </span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
