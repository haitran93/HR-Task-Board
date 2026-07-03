import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useCurrentUser } from '../lib/currentUser'

export default function TaskDetailModal({ task, project, onClose }) {
  const { currentUser } = useCurrentUser()
  const queryClient = useQueryClient()
  const [description, setDescription] = useState(task.description ?? '')
  const [uploading, setUploading] = useState(false)

  const { data: attachments = [] } = useQuery({
    queryKey: ['taskAttachments', task.id],
    queryFn: () => api.getTaskAttachments(task.id),
  })

  const saveDescription = useMutation({
    mutationFn: () => api.updateTask(task.id, { description }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const removeAttachment = useMutation({
    mutationFn: (attachment) => api.deleteTaskAttachment(attachment.id, attachment.file_path),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['taskAttachments', task.id] }),
  })

  async function handleFilePick(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      await api.uploadTaskAttachment(task.id, file, currentUser.id)
      queryClient.invalidateQueries({ queryKey: ['taskAttachments', task.id] })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function openAttachment(attachment) {
    const url = await api.getAttachmentUrl(attachment.file_path)
    window.open(url, '_blank', 'noopener')
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white border-2 border-ink rounded-card shadow-card w-[460px] p-6 flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div className="text-xl font-bold -tracking-[0.02em]">{task.title}</div>
          <div className="text-sm text-muted font-medium mt-1">{project?.name ?? 'No project'}</div>
        </div>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details, context, or instructions…"
            rows={4}
            className="border-2 border-ink rounded-btn px-3 py-2 font-medium text-sm resize-none"
          />
          <button
            disabled={description === (task.description ?? '') || saveDescription.isPending}
            onClick={() => saveDescription.mutate()}
            className="hard-btn self-start mt-1 px-3 py-[6px] border-2 border-ink rounded-btn font-bold text-xs bg-accent shadow-btn disabled:opacity-50"
          >
            {saveDescription.isPending ? 'Saving…' : 'Save description'}
          </button>
        </label>

        <div>
          <div className="text-sm font-semibold mb-2">Attachments</div>
          <div className="flex flex-col gap-2">
            {attachments.map((a) => (
              <div key={a.id} className="flex items-center gap-2 border-2 border-ink rounded-btn px-3 py-2">
                <span className="text-sm">📎</span>
                <button onClick={() => openAttachment(a)} className="flex-1 text-left text-sm font-semibold underline truncate">
                  {a.file_name}
                </button>
                <button
                  onClick={() => removeAttachment.mutate(a)}
                  className="text-xs font-bold text-program-retreat"
                  aria-label="Remove attachment"
                >
                  ×
                </button>
              </div>
            ))}
            {attachments.length === 0 && <div className="text-sm text-muted">No attachments yet.</div>}
          </div>
          <label className="mt-2 inline-block text-xs font-semibold text-muted border-2 border-dashed border-faded rounded-btn px-3 py-2 text-center cursor-pointer w-full">
            {uploading ? 'Uploading…' : 'Click to attach a screenshot or file'}
            <input type="file" onChange={handleFilePick} disabled={uploading} className="hidden" />
          </label>
        </div>

        <button onClick={onClose} className="self-end px-4 py-2 border-2 border-ink rounded-btn font-semibold text-sm bg-white">
          Close
        </button>
      </div>
    </div>
  )
}
