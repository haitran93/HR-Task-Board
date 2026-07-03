import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isWeekend,
  parseISO,
} from 'date-fns'
import { isLightColor } from '../lib/color'

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export default function MonthGrid({ month, events, projectsById, onEventClick }) {
  const monthStart = startOfMonth(month)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const eventsByDate = events.reduce((acc, e) => {
    ;(acc[e.date] = acc[e.date] || []).push(e)
    return acc
  }, {})

  return (
    <div className="bg-white border-2 border-ink rounded-card overflow-hidden">
      <div className="grid grid-cols-7 border-b-2 border-ink bg-bg">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={`px-3 py-[10px] text-[11px] font-bold tracking-[0.1em] ${i >= 5 ? 'text-faded' : 'text-muted'}`}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-[104px]">
        {days.map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const inMonth = isSameMonth(day, month)
          const today = isToday(day)
          const weekend = isWeekend(day)
          const dayEvents = eventsByDate[dateStr] || []
          const isLastCol = (i + 1) % 7 === 0
          const isLastRow = i >= days.length - 7

          return (
            <div
              key={dateStr}
              className={[
                'px-[9px] py-2 text-[13px] font-semibold overflow-hidden',
                !isLastCol ? 'border-r border-subtleBorder' : '',
                !isLastRow ? 'border-b border-subtleBorder' : '',
                !inMonth ? 'text-faded' : weekend ? 'bg-weekendTint' : '',
                today ? 'font-bold' : '',
              ].join(' ')}
              style={today ? { background: '#FDF0D0', outline: '2px solid #141414', outlineOffset: '-2px' } : undefined}
            >
              <span>{format(day, 'd')}</span>
              {today && (
                <span className="ml-[6px] text-[10px] bg-ink text-accent rounded px-[6px] py-[1px] font-bold">
                  TODAY
                </span>
              )}
              <div className="flex flex-col gap-1 mt-[5px]">
                {dayEvents.map((e) => {
                  const project = projectsById[e.project_id]
                  const overdue = !e.isMilestone && parseISO(e.date) < new Date(new Date().toDateString())
                  const chipColor = project?.color ?? '#6F6A60'
                  const lightBg = isLightColor(chipColor)
                  return (
                    <div
                      key={e.id}
                      onClick={() => onEventClick?.(e)}
                      className="rounded-[7px] text-[11.5px] font-semibold px-[7px] py-[2px] cursor-pointer truncate"
                      style={{
                        background: overdue ? '#FFE9E0' : chipColor,
                        color: overdue ? '#E4572E' : lightBg ? '#141414' : '#fff',
                        border: `1.5px solid ${overdue ? '#E4572E' : '#141414'}`,
                        fontWeight: e.isMilestone ? 700 : 600,
                      }}
                    >
                      {overdue ? '⚠ ' : e.isMilestone ? '◆ ' : ''}
                      {e.title}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
