import { startOfWeek, addDays, format, isWeekend } from 'date-fns'

const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export default function WeekStrip({ openTasks, doneTasks }) {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 })
  const days = Array.from({ length: 14 }, (_, i) => addDays(start, i))
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-7 gap-x-[10px]">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="text-[11px] font-bold text-[#9a927f] text-center">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-x-[10px] gap-y-[10px]">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const today = dateStr === todayStr
          const weekend = isWeekend(day)
          const dueToday = openTasks.filter((t) => t.due_date === dateStr)
          const upcomingCount = dueToday.filter((t) => !t.overdue).length
          const overdueCount = dueToday.filter((t) => t.overdue).length
          const doneCount = doneTasks.filter((t) => t.due_date === dateStr).length

          return (
            <div key={dateStr}>
              <div
                className={`text-[10px] font-bold mb-1 text-center ${
                  today ? 'text-ink' : weekend ? 'text-faded' : 'text-[#9a927f]'
                }`}
              >
                {format(day, 'd MMM')}
              </div>
              {weekend ? (
                <div className="border-2 border-dashed border-faded rounded-chip h-7" />
              ) : (
                <div
                  className="border-2 border-ink rounded-chip h-7 bg-white flex items-stretch overflow-hidden"
                  style={today ? { boxShadow: '3px 3px 0 #E4572E' } : undefined}
                >
                  <div className="flex-1 flex items-center justify-center">
                    {upcomingCount > 0 && (
                      <span
                        className="w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
                        style={{ background: '#EAB308' }}
                      >
                        {upcomingCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    {overdueCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-program-retreat text-white text-[9px] font-bold flex items-center justify-center">
                        {overdueCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    {doneCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-program-training text-white text-[9px] font-bold flex items-center justify-center">
                        {doneCount}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
