import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useCurrentUser } from '../lib/currentUser'

const COLORS = ['yellow', 'green', 'pink', 'blue']

export default function IdeaComposer({ x, y, myFunctions, onClose }) {
  const { currentUser } = useCurrentUser()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [shareFunctionId, setShareFunctionId] = useState('') // '' = private
  const [color] = useState(() => COLORS[Math.floor(Math.random() * COLORS.length)])

  function handlePaste(e) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'))
    if (item) {
      const file = item.getAsFile()
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  function handleFilePick(e) {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const create = useMutation({
    mutationFn: async () => {
      let imageUrl = null
      if (imageFile) imageUrl = await api.uploadIdeaImage(imageFile)
      return api.createIdea({
        authorId: currentUser.id,
        text: text.trim() || null,
        imageUrl,
        x,
        y,
        color,
        visibility: shareFunctionId ? 'function' : 'private',
        sharedFunctionId: shareFunctionId || null,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] })
      onClose()
    },
  })

  const canSubmit = (text.trim() || imageFile) && !create.isPending

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white border-2 border-ink rounded-card shadow-card w-[380px] p-6 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xl font-bold -tracking-[0.02em]">+ Sticky</div>

        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={handlePaste}
          placeholder="Type an idea, or paste a screenshot…"
          rows={4}
          className="border-2 border-ink rounded-btn px-3 py-2 font-medium text-sm resize-none"
        />

        {imagePreview ? (
          <div className="relative">
            <img src={imagePreview} alt="" className="w-full max-h-[160px] object-cover rounded-btn border-2 border-ink" />
            <button
              onClick={() => {
                setImageFile(null)
                setImagePreview(null)
              }}
              className="absolute top-1 right-1 w-6 h-6 bg-white border-2 border-ink rounded-full text-xs font-bold"
            >
              ×
            </button>
          </div>
        ) : (
          <label className="text-xs font-semibold text-muted border-2 border-dashed border-faded rounded-btn px-3 py-2 text-center cursor-pointer">
            paste an image above, or click to choose a file
            <input type="file" accept="image/*" onChange={handleFilePick} className="hidden" />
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm font-semibold">
          Visibility
          <select
            value={shareFunctionId}
            onChange={(e) => setShareFunctionId(e.target.value)}
            className="border-2 border-ink rounded-btn px-2 py-2 font-medium text-sm"
          >
            <option value="">Private (only me)</option>
            {myFunctions.map((f) => (
              <option key={f.id} value={f.id}>
                Share to {f.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-2 justify-end mt-1">
          <button onClick={onClose} className="px-4 py-2 border-2 border-ink rounded-btn font-semibold text-sm bg-white">
            Cancel
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => create.mutate()}
            className="hard-btn px-4 py-2 border-2 border-ink rounded-btn font-bold text-sm bg-accent shadow-btn disabled:opacity-50"
          >
            {create.isPending ? 'Adding…' : 'Add sticky'}
          </button>
        </div>
      </div>
    </div>
  )
}
