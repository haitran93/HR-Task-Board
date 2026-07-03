import { useState } from 'react'

const CHANNELS = [
  { id: 'email', label: 'Email' },
  { id: 'chat', label: 'Chat' },
  { id: 'other', label: 'Other' },
]

export default function CompletionChannelPicker({ onSubmit, onClose }) {
  const [channel, setChannel] = useState(null)
  const [note, setNote] = useState('')

  function pick(id) {
    if (id === 'other') {
      setChannel('other')
      return
    }
    onSubmit(id, '')
  }

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute left-0 top-[34px] z-40 bg-white border-2 border-ink rounded-card shadow-card p-3 w-56 flex flex-col gap-2">
        <div className="text-xs font-bold tracking-[0.08em] text-muted px-1">MARKED DONE VIA</div>
        <div className="flex gap-2">
          {CHANNELS.map((c) => (
            <button
              key={c.id}
              onClick={() => pick(c.id)}
              className={[
                'flex-1 text-xs font-bold border-2 border-ink rounded-btn py-[6px]',
                channel === c.id ? 'bg-accent' : 'bg-white hover:bg-bg',
              ].join(' ')}
            >
              {c.label}
            </button>
          ))}
        </div>
        {channel === 'other' && (
          <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="How was it reported?"
              className="border-2 border-ink rounded-btn px-2 py-[6px] text-xs font-medium"
              onKeyDown={(e) => e.key === 'Enter' && note.trim() && onSubmit('other', note.trim())}
            />
            <button
              disabled={!note.trim()}
              onClick={() => onSubmit('other', note.trim())}
              className="hard-btn text-xs font-bold border-2 border-ink rounded-btn py-[6px] bg-accent disabled:opacity-50"
            >
              Confirm
            </button>
          </div>
        )}
      </div>
    </>
  )
}
