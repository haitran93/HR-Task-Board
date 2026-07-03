import { useRef, useState } from 'react'
import StickyNote from './StickyNote'

const DRAG_THRESHOLD = 5

export default function StickyBoard({ ideas, peopleById, functionsById = {}, currentUserId, onMove, onCreateAt, onDelete }) {
  const boardRef = useRef(null)
  const [localPositions, setLocalPositions] = useState({})
  const dragState = useRef(null)

  function handlePointerDown(e, idea) {
    e.stopPropagation()
    const boardRect = boardRef.current.getBoundingClientRect()
    dragState.current = {
      id: idea.id,
      startX: e.clientX,
      startY: e.clientY,
      originX: idea.x,
      originY: idea.y,
      moved: false,
      boardRect,
    }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  function handlePointerMove(e) {
    const state = dragState.current
    if (!state) return
    const dx = e.clientX - state.startX
    const dy = e.clientY - state.startY
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) state.moved = true
    if (!state.moved) return
    const x = Math.max(0, Math.min(state.originX + dx, state.boardRect.width - 200))
    const y = Math.max(0, Math.min(state.originY + dy, state.boardRect.height - 100))
    setLocalPositions((prev) => ({ ...prev, [state.id]: { x, y } }))
  }

  function handlePointerUp() {
    const state = dragState.current
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
    if (state?.moved) {
      const pos = localPositions[state.id]
      if (pos) onMove(state.id, pos.x, pos.y)
    }
    dragState.current = null
  }

  function handleBoardDoubleClick(e) {
    if (e.target !== boardRef.current) return
    const rect = boardRef.current.getBoundingClientRect()
    const x = Math.max(0, e.clientX - rect.left - 100)
    const y = Math.max(0, e.clientY - rect.top - 50)
    onCreateAt(x, y)
  }

  return (
    <div
      ref={boardRef}
      onDoubleClick={handleBoardDoubleClick}
      className="mx-8 mt-3 mb-8 h-[480px] bg-white border-2 border-ink rounded-card relative overflow-hidden"
      style={{
        backgroundImage: 'radial-gradient(#E5DBC6 1.5px, transparent 1.5px)',
        backgroundSize: '26px 26px',
      }}
    >
      {ideas.map((idea) => {
        const pos = localPositions[idea.id] || { x: idea.x, y: idea.y }
        const isOwn = idea.author_id === currentUserId
        return (
          <StickyNote
            key={idea.id}
            idea={idea}
            author={peopleById[idea.author_id]}
            functionName={functionsById[idea.shared_function_id]?.name}
            isOwn={isOwn}
            style={{ left: pos.x, top: pos.y }}
            onPointerDown={(e) => handlePointerDown(e, idea)}
            onDelete={(e) => {
              e.stopPropagation()
              onDelete(idea.id)
            }}
          />
        )
      })}
      {ideas.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted text-sm font-medium">
          Nothing here yet — double-click to add an idea.
        </div>
      )}
      <div className="absolute right-6 bottom-5 border-2 border-dashed border-[#9a927f] rounded-[10px] px-[14px] py-2 text-[#9a927f] text-[13px] font-semibold bg-[rgba(253,246,234,.85)]">
        double-click anywhere to add · drag your own stickies to move
      </div>
    </div>
  )
}
