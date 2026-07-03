const COLOR_HEX = {
  yellow: '#FFD23F',
  green: '#B9E4C5',
  pink: '#F6C6DA',
  blue: '#CFD8F9',
}

export default function StickyNote({ idea, author, functionName, isOwn, style, onPointerDown, onDelete }) {
  const badge =
    idea.visibility === 'everyone' ? 'HR team' : idea.visibility === 'function' ? functionName ?? 'shared' : null

  return (
    <div
      onPointerDown={isOwn ? onPointerDown : undefined}
      className="absolute w-[200px] p-4 border-2 border-ink rounded-sticky select-none"
      style={{
        background: COLOR_HEX[idea.color] || COLOR_HEX.yellow,
        transform: `rotate(${idea.rotation}deg)`,
        boxShadow: '4px 5px 0 rgba(20,20,20,.25)',
        touchAction: 'none',
        cursor: isOwn ? 'grab' : 'default',
        ...style,
      }}
    >
      {isOwn && (
        <button
          onClick={onDelete}
          className="absolute -top-2 -right-2 w-5 h-5 bg-white border-2 border-ink rounded-full text-[11px] font-bold leading-none flex items-center justify-center"
          aria-label="Delete idea"
        >
          ×
        </button>
      )}
      {badge && (
        <div className="inline-block text-[10px] font-bold bg-ink text-white rounded px-2 py-[2px] mb-2">{badge}</div>
      )}
      {idea.image_url && (
        <img src={idea.image_url} alt="" className="w-full rounded-[2px] border border-ink/20 mb-2 max-h-[140px] object-cover" />
      )}
      {idea.text && <div className="font-semibold text-[15px] leading-[1.35]">{idea.text}</div>}
      <div className="text-[11px] font-semibold text-muted mt-3 text-right">{author?.name ?? ''}</div>
    </div>
  )
}
