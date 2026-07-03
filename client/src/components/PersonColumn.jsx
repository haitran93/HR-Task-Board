import { useState } from 'react'
import MiniTaskCard from './MiniTaskCard'

export default function PersonColumn({ person, tasks, projectsById, onDropTask }) {
  const [dragOver, setDragOver] = useState(false)

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const taskId = e.dataTransfer.getData('text/plain')
        if (taskId) onDropTask(taskId, person.id)
      }}
      className={[
        'bg-white border-2 rounded-card p-4 transition-colors',
        person.overloaded ? 'border-program-retreat' : 'border-ink',
        dragOver ? 'bg-bg' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-[9px] mb-[14px]">
        <span
          className="w-[30px] h-[30px] text-white border-2 border-ink rounded-chip flex items-center justify-center font-bold text-[13px]"
          style={{ background: person.avatar_color }}
        >
          {person.name[0]}
        </span>
        <b className="text-[15px]">
          {person.name}
          {person.overloaded ? ' ⚠' : ''}
        </b>
        <span className="ml-auto text-xs font-bold text-muted">{person.openCount}</span>
      </div>
      <div className="flex flex-col gap-[9px]">
        {tasks.map((t) => (
          <MiniTaskCard key={t.id} task={t} project={projectsById[t.project_id]} />
        ))}
        <div className="border-2 border-dashed border-[#9a927f] rounded-chip px-3 py-[9px] text-[#9a927f] text-[12.5px] font-semibold text-center">
          ⟵ drag here to reassign
        </div>
      </div>
    </div>
  )
}
