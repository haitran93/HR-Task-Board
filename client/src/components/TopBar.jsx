import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useCurrentUser } from '../lib/currentUser'

const TABS = [
  { to: '/', label: 'My Tasks' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/brainstorm', label: 'Brainstorm' },
]

function tabClass({ isActive }) {
  return [
    'px-[18px] py-2 border-2 border-ink rounded-btn font-semibold text-sm',
    isActive ? 'bg-ink text-bg font-bold' : 'bg-white hover:bg-accent transition-colors',
  ].join(' ')
}

export default function TopBar({ rightExtra, onAddTask }) {
  const { currentUser, signOut } = useCurrentUser()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="flex items-center gap-6 px-8 py-[18px] border-b-2 border-ink bg-white relative">
      <div className="flex items-center gap-[10px]">
        <div className="w-[34px] h-[34px] bg-ink rounded-chip flex items-center justify-center text-accent font-bold text-base">
          H
        </div>
        <div className="font-bold text-[17px] -tracking-[0.02em]">HR Hub</div>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} className={tabClass} end={t.to === '/'}>
            {t.label}
          </NavLink>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-3">
        {rightExtra}
        {onAddTask && (
          <button
            onClick={onAddTask}
            className="hard-btn px-[18px] py-2 bg-accent border-2 border-ink rounded-btn font-bold text-sm shadow-btn"
          >
            + Task
          </button>
        )}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            style={{ background: currentUser?.avatar_color }}
            className="w-[38px] h-[38px] text-white border-2 border-ink rounded-chip flex items-center justify-center font-bold text-base"
          >
            {currentUser?.name?.[0] ?? '?'}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-[46px] w-56 bg-white border-2 border-ink rounded-card shadow-card z-20 py-2">
              <div className="px-4 py-2 text-sm font-bold">{currentUser?.name}</div>
              <div className="px-4 pb-2 text-xs text-muted">@{currentUser?.username}</div>
              {currentUser?.isAdmin && (
                <>
                  <div className="border-t-2 border-dashed border-faded my-1" />
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      navigate('/admin')
                    }}
                    className="w-full text-left px-4 py-[6px] text-sm font-bold hover:bg-bg"
                  >
                    Enter admin mode →
                  </button>
                </>
              )}
              <div className="border-t-2 border-dashed border-faded my-1" />
              <button
                onClick={() => {
                  setMenuOpen(false)
                  signOut()
                }}
                className="w-full text-left px-4 py-[6px] text-sm font-semibold hover:bg-bg text-program-retreat"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
