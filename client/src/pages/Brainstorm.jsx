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
  const [view, setView] = useState('mine') // 'mine' | 'team'
  const [teamFunctionId, setTeamFunctionId] = useState(null)
  const [composerAt, setComposerAt] = useState(null) // { x, y } while open

  const { data: ideas = [] } = useQuery({ queryKey: ['ideas'], queryFn: api.getIdeas, enabled: !!currentUser })
  const { data: functions = [] } = useQuery({ queryKey: ['functions'], queryFn: api.getFunctions })
  const { data: personFunctions = [] } = useQuery({ queryKey: ['personFunctions'], queryFn: api.getPersonFunctions })

  const peopleById = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people])

  const myFunctionIds = useMemo(
    () => personFunctions.filter((pf) => pf.person_id === currentUser?.id).map((pf) => pf.function_id),
    [personFunctions, currentUser]
  )
  const myFunctions = functions.filter((f) => myFunctionIds.includes(f.id))
  // Admins can browse (and post to) any function's wall, not just their own —
  // they already see every function-shared idea via RLS, this just exposes it in the UI.
  const viewableFunctions = currentUser?.isAdmin ? functions : myFunctions
  const activeFunctionId = teamFunctionId ?? viewableFunctions[0]?.id ?? null

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
    view === 'mine'
      ? ideas.filter((i) => i.author_id === currentUser.id)
      : ideas.filter((i) => i.visibility === 'function' && i.shared_function_id === activeFunctionId)

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
        <div className="flex gap-2">
          <button
            onClick={() => setView('mine')}
            className={`text-[12.5px] font-semibold border-2 border-ink rounded-chip px-3 py-[5px] ${
              view === 'mine' ? 'bg-ink text-bg' : 'bg-white'
            }`}
          >
            My wall
          </button>
          <button
            onClick={() => setView('team')}
            className={`text-[12.5px] font-semibold border-2 border-ink rounded-chip px-3 py-[5px] ${
              view === 'team' ? 'bg-ink text-bg' : 'bg-white'
            }`}
          >
            Team
          </button>
        </div>
        {view === 'team' && viewableFunctions.length > 1 && (
          <div className="flex gap-2 ml-2 flex-wrap">
            {viewableFunctions.map((f) => (
              <span
                key={f.id}
                onClick={() => setTeamFunctionId(f.id)}
                className={`text-[12px] font-semibold border-2 border-ink rounded-pill px-3 py-[4px] cursor-pointer ${
                  activeFunctionId === f.id ? 'bg-ink text-bg' : 'bg-white'
                }`}
              >
                {f.name}
              </span>
            ))}
          </div>
        )}
        <div className="text-sm font-medium text-muted ml-2">
          {view === 'mine'
            ? 'private by default'
            : activeFunctionId
              ? `shared to ${functions.find((f) => f.id === activeFunctionId)?.name ?? '…'}`
              : ''}
        </div>
      </div>

      {view === 'team' && viewableFunctions.length === 0 ? (
        <div className="mx-8 mt-3 mb-8 h-[200px] bg-white border-2 border-dashed border-faded rounded-card flex items-center justify-center text-sm text-muted font-medium">
          You're not part of a function yet — ask your admin to add you to one under Admin → Members.
        </div>
      ) : (
        <StickyBoard
          ideas={visibleIdeas}
          peopleById={peopleById}
          currentUserId={currentUser.id}
          onMove={(id, x, y) => move.mutate({ id, x, y })}
          onCreateAt={(x, y) => setComposerAt({ x, y })}
          onDelete={(id) => remove.mutate(id)}
        />
      )}

      {composerAt && (
        <IdeaComposer x={composerAt.x} y={composerAt.y} myFunctions={viewableFunctions} onClose={() => setComposerAt(null)} />
      )}
    </div>
  )
}
