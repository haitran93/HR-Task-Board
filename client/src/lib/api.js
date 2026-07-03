import { supabase } from './supabase'

function unwrap({ data, error }) {
  if (error) throw error
  return data
}

function unwrapCount({ count, error }) {
  if (error) throw error
  return count ?? 0
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function withDerivedTask(task) {
  return {
    ...task,
    reminderEnabled: task.reminder_enabled,
    overdue: task.status === 'open' && task.due_date < todayStr(),
  }
}

export const api = {
  // ---- people ----
  async getPeople() {
    const rows = unwrap(await supabase.from('people').select('*').order('name'))
    return rows.map((p) => ({ ...p, isAdmin: p.is_admin }))
  },

  async getFunctions() {
    return unwrap(await supabase.from('functions').select('*').order('name'))
  },

  async getPersonFunctions() {
    return unwrap(await supabase.from('person_functions').select('*'))
  },

  async updatePerson(id, { name, avatarColor, isAdmin }) {
    const patch = {}
    if (name !== undefined) patch.name = name
    if (avatarColor !== undefined) patch.avatar_color = avatarColor
    if (isAdmin !== undefined) patch.is_admin = isAdmin
    const row = unwrap(await supabase.from('people').update(patch).eq('id', id).select().single())
    return { ...row, isAdmin: row.is_admin }
  },

  async setPersonFunctions(personId, functionIds) {
    unwrap(await supabase.from('person_functions').delete().eq('person_id', personId))
    if (functionIds.length) {
      unwrap(
        await supabase.from('person_functions').insert(functionIds.map((functionId) => ({ person_id: personId, function_id: functionId })))
      )
    }
  },

  // Counts of what cascade-deletes if this person is removed (their tasks + their brainstorm ideas).
  async getPersonImpact(id) {
    const taskRes = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('assignee_id', id)
    const ideaRes = await supabase.from('ideas').select('*', { count: 'exact', head: true }).eq('author_id', id)
    return { taskCount: unwrapCount(taskRes), ideaCount: unwrapCount(ideaRes) }
  },

  async deletePerson(id) {
    unwrap(await supabase.from('people').delete().eq('id', id))
  },

  // ---- projects ----
  async getProjects() {
    return unwrap(await supabase.from('projects').select('*').order('created_at'))
  },

  async createProject({ name, color }) {
    return unwrap(await supabase.from('projects').insert({ name, color }).select().single())
  },

  async getProjectTeam(projectId) {
    const rows = unwrap(await supabase.from('project_teams').select('person_id').eq('project_id', projectId))
    return rows.map((r) => r.person_id)
  },

  async setProjectTeam(projectId, personIds) {
    unwrap(await supabase.from('project_teams').delete().eq('project_id', projectId))
    if (personIds.length) {
      unwrap(
        await supabase.from('project_teams').insert(personIds.map((personId) => ({ project_id: projectId, person_id: personId })))
      )
    }
  },

  async updateProject(id, { name, color }) {
    const patch = {}
    if (name !== undefined) patch.name = name
    if (color !== undefined) patch.color = color
    return unwrap(await supabase.from('projects').update(patch).eq('id', id).select().single())
  },

  // Counts of what happens if this project is deleted: tasks get unassigned from
  // it (project_id -> null, not deleted), but events cascade-delete with it.
  async getProjectImpact(id) {
    const taskRes = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('project_id', id)
    const eventRes = await supabase.from('events').select('*', { count: 'exact', head: true }).eq('project_id', id)
    return { taskCount: unwrapCount(taskRes), eventCount: unwrapCount(eventRes) }
  },

  async deleteProject(id) {
    unwrap(await supabase.from('projects').delete().eq('id', id))
  },

  // ---- tasks ----
  async getTasks({ assigneeId, projectId, status } = {}) {
    let query = supabase.from('tasks').select('*').order('due_date')
    if (assigneeId) query = query.eq('assignee_id', assigneeId)
    if (projectId) query = query.eq('project_id', projectId)
    if (status) query = query.eq('status', status)
    const rows = unwrap(await query)
    return rows.map(withDerivedTask)
  },

  // Fan-out create: one task row per person, sharing a batch_id so the admin can audit them as one unit.
  // Used for both single-assignee ("+ Task") and group-assignment ("+ Assign task") flows.
  async createTaskBatch({ title, projectId, assigneeIds, dueDate, priority = 'med', reminderEnabled = true, reminderOffsetDays = 3 }) {
    const batchId = crypto.randomUUID()
    const rows = assigneeIds.map((assigneeId) => ({
      title,
      project_id: projectId ?? null,
      assignee_id: assigneeId,
      due_date: dueDate,
      priority,
      reminder_enabled: reminderEnabled,
      reminder_offset_days: reminderOffsetDays,
      batch_id: batchId,
    }))
    const created = unwrap(await supabase.from('tasks').insert(rows).select())
    return created.map(withDerivedTask)
  },

  async updateTask(id, data) {
    const patch = {}
    if (data.title !== undefined) patch.title = data.title
    if (data.projectId !== undefined) patch.project_id = data.projectId
    if (data.assigneeId !== undefined) patch.assignee_id = data.assigneeId
    if (data.dueDate !== undefined) patch.due_date = data.dueDate
    if (data.priority !== undefined) patch.priority = data.priority
    if (data.status !== undefined) patch.status = data.status
    if (data.reminderEnabled !== undefined) patch.reminder_enabled = data.reminderEnabled
    if (data.reminderOffsetDays !== undefined) patch.reminder_offset_days = data.reminderOffsetDays
    if (data.completionChannel !== undefined) patch.completion_channel = data.completionChannel
    if (data.completionNote !== undefined) patch.completion_note = data.completionNote
    if (data.completedBy !== undefined) patch.completed_by = data.completedBy
    if (data.completedAt !== undefined) patch.completed_at = data.completedAt
    const row = unwrap(await supabase.from('tasks').update(patch).eq('id', id).select().single())
    return withDerivedTask(row)
  },

  // Applies shared fields (title/project/due date/priority) across every row in a
  // batch at once — used by admin task management to edit a group-assigned task.
  async updateTasksBulk(ids, data) {
    const patch = {}
    if (data.title !== undefined) patch.title = data.title
    if (data.projectId !== undefined) patch.project_id = data.projectId
    if (data.dueDate !== undefined) patch.due_date = data.dueDate
    if (data.priority !== undefined) patch.priority = data.priority
    const rows = unwrap(await supabase.from('tasks').update(patch).in('id', ids).select())
    return rows.map(withDerivedTask)
  },

  async deleteTask(id) {
    unwrap(await supabase.from('tasks').delete().eq('id', id))
  },

  async deleteTasksBulk(ids) {
    unwrap(await supabase.from('tasks').delete().in('id', ids))
  },

  // ---- events ----
  async getEvents(month) {
    let query = supabase.from('events').select('*').order('date')
    if (month) {
      const start = `${month}-01`
      const [y, m] = month.split('-').map(Number)
      const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
      query = query.gte('date', start).lt('date', nextMonth)
    }
    const events = unwrap(await query)
    if (!events.length) return []
    const owners = unwrap(
      await supabase
        .from('event_owners')
        .select('event_id, person_id')
        .in('event_id', events.map((e) => e.id))
    )
    const ownersByEvent = {}
    owners.forEach((o) => {
      ;(ownersByEvent[o.event_id] = ownersByEvent[o.event_id] || []).push(o.person_id)
    })
    return events.map((e) => ({ ...e, isMilestone: e.is_milestone, ownerIds: ownersByEvent[e.id] || [] }))
  },

  async createEvent({ title, projectId, date, isMilestone = false, linkedTaskId = null, ownerIds = [] }) {
    const event = unwrap(
      await supabase
        .from('events')
        .insert({ title, project_id: projectId, date, is_milestone: isMilestone, linked_task_id: linkedTaskId })
        .select()
        .single()
    )
    if (ownerIds.length) {
      unwrap(await supabase.from('event_owners').insert(ownerIds.map((personId) => ({ event_id: event.id, person_id: personId }))))
    }
    return { ...event, isMilestone: event.is_milestone, ownerIds }
  },

  async updateEvent(id, { title, projectId, date, isMilestone, ownerIds }) {
    const patch = {}
    if (title !== undefined) patch.title = title
    if (projectId !== undefined) patch.project_id = projectId
    if (date !== undefined) patch.date = date
    if (isMilestone !== undefined) patch.is_milestone = isMilestone
    let event
    if (Object.keys(patch).length) {
      event = unwrap(await supabase.from('events').update(patch).eq('id', id).select().single())
    } else {
      event = unwrap(await supabase.from('events').select('*').eq('id', id).single())
    }
    if (ownerIds !== undefined) {
      unwrap(await supabase.from('event_owners').delete().eq('event_id', id))
      if (ownerIds.length) {
        unwrap(await supabase.from('event_owners').insert(ownerIds.map((personId) => ({ event_id: id, person_id: personId }))))
      }
    }
    return { ...event, isMilestone: event.is_milestone, ownerIds: ownerIds ?? [] }
  },

  async deleteEvent(id) {
    unwrap(await supabase.from('events').delete().eq('id', id))
  },

  // ---- reminder rules ----
  async getReminderRules() {
    return unwrap(await supabase.from('reminder_rules').select('*'))
  },

  async updateReminderRule(projectId, { offsetDays, morningOf }) {
    const patch = {}
    if (offsetDays !== undefined) patch.offset_days = offsetDays
    if (morningOf !== undefined) patch.morning_of = morningOf
    return unwrap(await supabase.from('reminder_rules').update(patch).eq('project_id', projectId).select().single())
  },

  // ---- ideas (brainstorm walls) ----
  // RLS already scopes this to: my own ideas + ideas shared to a function I'm in
  // (+ everything if admin) — no separate "mine" vs "team" query needed here,
  // the page splits the one result set client-side.
  async getIdeas() {
    return unwrap(await supabase.from('ideas').select('*').order('created_at'))
  },

  async uploadIdeaImage(file) {
    const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    unwrap(await supabase.storage.from('brainstorm-images').upload(path, file))
    const { data } = supabase.storage.from('brainstorm-images').getPublicUrl(path)
    return data.publicUrl
  },

  async createIdea({ authorId, text, imageUrl = null, x = 40, y = 40, color = 'yellow', visibility = 'private', sharedFunctionId = null }) {
    const rotation = (Math.random() * 4.4 - 2.2).toFixed(2)
    return unwrap(
      await supabase
        .from('ideas')
        .insert({
          author_id: authorId,
          text,
          image_url: imageUrl,
          x,
          y,
          rotation,
          color,
          visibility,
          shared_function_id: sharedFunctionId,
        })
        .select()
        .single()
    )
  },

  async updateIdea(id, { x, y, text }) {
    const patch = {}
    if (x !== undefined) patch.x = x
    if (y !== undefined) patch.y = y
    if (text !== undefined) patch.text = text
    return unwrap(await supabase.from('ideas').update(patch).eq('id', id).select().single())
  },

  async deleteIdea(id) {
    unwrap(await supabase.from('ideas').delete().eq('id', id))
  },
}
