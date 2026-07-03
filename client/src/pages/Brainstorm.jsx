import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useCurrentUser } from '../lib/currentUser'
import TopBar from '../components/TopBar'
import StickyBoard from '../components/StickyBoard'
import IdeaComposer from '../components/IdeaComposer'

export default function Brainstorm() {
  const { currentUser, people } = useCurrentUser()
  const queryClient = useQueryClient()
  const [view, setView] = useState('self') // 'self' | 'everyone' | a function id
  const [composerAt, setComposerAt] = useState(null) // { x, y } while open

  const { data: ideas = [] } = useQuery({ queryKey: ['ideas'], queryFn: api.getIdeas, enabled: !!currentUser })
  const { data: functions = [] } = useQuery({ queryKey: ['functions'], queryFn: api.getFunctions })
  const { data: personFunctions = [] } = useQuery({ queryKey: ['personFunctions'], queryFn: api.getPersonFunctions })

  const peopleById = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people])
  const functionsById = useMemo(() => Object.fromEntries(functions.map((f) => [f.id, f])), [functions])

  const myFunctionIds = useMemo(
    () => personFunctions.filter((pf) => pf.person_id === currentUser?.id).map((pf) => pf.function_id),
    [personFunctions, currentUser]
  )
  // Admins can see (and post to) every function's wall — they already can via RLS,
  // this just surfaces it as its own named tab instead of a combined picker.
  const viewableFunctions = currentUser?.isAdmin ? functions : functions.filter((f) => myFunctionIds.includes(f.id))

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['ideas'] })

  const move = useMutation({
    mutationFn: ({ id, x, y }) => api.updateIdea(id, { x, y }),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id) => api.deleteIdea(id),
    onSuccess: invalidate,
  })

  if (!currentUser) return null

  const visibleIdeas =
    view === 'self'
      ? ideas.filter((i) => i.author_id === currentUser.id)
      : view === 'everyone'
        ? ideas.filter((i) => i.visibility === 'everyone')
        : ideas.filter((i) => i.visibility === 'function' && i.shared_function_id === view)

  const activeLabel =
    view === 'self' ? 'private, only you' : view === 'everyone' ? 'visible to the whole HR team' : `shared with ${functions.find((f) => f.id === view)?.name ?? ''}`

  return (
    <div>
      <TopBar
        rightExtra={
          <button
            onClick={() => setComposerAt({ x: 60 + Math.random() * 300, y: 60 + Math.random() * 200 })}
            className="hard-btn px-[18px] py-2 bg-accent border-2 border-ink rounded-btn font-bold text-sm shadow-btn"
          >
            + Sticky
          </button>
        }
      />
      <div className="px-8 pt-6 pb-3 flex items-center gap-[14px] flex-wrap">
        <div className="text-[26px] font-bold -tracking-[0.03em]">💡 Brainstorm</div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setView('self')}
            className={`text-[12.5px] font-semibold border-2 border-ink rounded-chip px-3 py-[5px] ${
              view === 'self' ? 'bg-ink text-bg' : 'bg-white'
            }`}
          >
            Self
          </button>
          {viewableFunctions.map((f) => (
            <button
              key={f.id}
              onClick={() => setView(f.id)}
              className={`text-[12.5px] font-semibold border-2 border-ink rounded-chip px-3 py-[5px] ${
                view === f.id ? 'bg-ink text-bg' : 'bg-white'
              }`}
            >
              {f.name}
            </button>
          ))}
          <button
            onClick={() => setView('everyone')}
            className={`text-[12.5px] font-semibold border-2 border-ink rounded-chip px-3 py-[5px] ${
              view === 'everyone' ? 'bg-ink text-bg' : 'bg-white'
            }`}
          >
            HR team
          </button>
        </div>
        <div className="text-sm font-medium text-muted ml-2">{activeLabel}</div>
      </div>

      <StickyBoard
        ideas={visibleIdeas}
        peopleById={peopleById}
        functionsById={functionsById}
        currentUserId={currentUser.id}
        onMove={(id, x, y) => move.mutate({ id, x, y })}
        onCreateAt={(x, y) => setComposerAt({ x, y })}
        onDelete={(id) => remove.mutate(id)}
      />

      {composerAt && (
        <IdeaComposer
          x={composerAt.x}
          y={composerAt.y}
          myFunctions={viewableFunctions}
          defaultVisibility={view === 'self' ? '' : view === 'everyone' ? 'everyone' : view}
          onClose={() => setComposerAt(null)}
        />
      )}
    </div>
  )
}
