import { useState } from 'react'
import { hexToRgba } from '../lib/color'

export default function FilterPills({ projects, selected, onSelect }) {
  const [hoveredId, setHoveredId] = useState(null)

  return (
    <div className="flex gap-[10px] flex-wrap">
      <span
        onClick={() => onSelect(null)}
        className={[
          'text-[13.5px] font-bold border-2 border-ink rounded-pill px-[18px] py-[6px] cursor-pointer',
          selected === null ? 'bg-ink text-bg' : 'bg-white hover:bg-bg',
        ].join(' ')}
      >
        All
      </span>
      {projects.map((p) => (
        <span
          key={p.id}
          onClick={() => onSelect(p.id)}
          onMouseEnter={() => setHoveredId(p.id)}
          onMouseLeave={() => setHoveredId(null)}
          style={
            selected !== p.id && hoveredId === p.id ? { background: hexToRgba(p.color, 0.12) } : undefined
          }
          className={[
            'text-[13.5px] font-semibold border-2 border-ink rounded-pill px-[18px] py-[6px] flex items-center gap-[7px] cursor-pointer transition-colors',
            selected === p.id ? 'bg-ink text-bg' : 'bg-white',
          ].join(' ')}
        >
          <span className="w-[10px] h-[10px] rounded-full" style={{ background: p.color }} />
          {p.name}
        </span>
      ))}
    </div>
  )
}
