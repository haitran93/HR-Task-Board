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
        const dueTasks = tasks.filter((t) => t.due_date === dateStr)
        const count = dueTasks.length
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
              <div className="border-2 border-dashed border-faded rounded-chip h-11" />
            ) : today ? (
              <div
                className="border-2 border-ink rounded-chip h-11 bg-ink flex items-center justify-center gap-[6px]"
                style={{ boxShadow: '3px 3px 0 #E4572E' }}
              >
                <span className="text-accent font-bold text-[13px]">TODAY</span>
                {count > 0 && (
                  <span className="w-5 h-5 rounded-full bg-accent text-ink text-[11px] font-bold flex items-center justify-center">
                    {count}
                  </span>
                )}
              </div>
            ) : (
              <div
                className="relative border-2 border-ink rounded-chip h-11 bg-white flex items-center justify-center overflow-hidden"
              >
                {count > 0 && (
                  <>
                    <span className="font-bold text-base" style={{ color: accentColor }}>
                      {count}
                    </span>
                    <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: accentColor }} />
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
