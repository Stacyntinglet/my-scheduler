import { useState } from 'react'
import { X, Clock } from 'lucide-react'

import type { Task } from '../types'
import { supabase } from '../utils/supabase'

interface AddTaskModalProps {
  onClose: () => void
  onTaskAdded?: (task: Task) => void
  defaultDueDate?: string
}

function calculateDaysUntilDue(date: string) {
  if (!date) {
    return 0
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due = new Date(`${date}T00:00:00`)
  due.setHours(0, 0, 0, 0)

  return Math.round(
    (due.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  )
}

function buildDuration(
  hours: number,
  minutes: number
) {
  const safeHours = Math.max(
    0,
    Math.floor(hours)
  )

  const safeMinutes = Math.max(
    0,
    Math.floor(minutes)
  )

  const extraHours = Math.floor(
    safeMinutes / 60
  )

  const remainingMinutes =
    safeMinutes % 60

  const totalHours =
    safeHours + extraHours

  const parts: string[] = []

  if (totalHours > 0) {
    parts.push(
      `${totalHours} ${
        totalHours === 1
          ? 'hour'
          : 'hours'
      }`
    )
  }

  if (remainingMinutes > 0) {
    parts.push(
      `${remainingMinutes} min`
    )
  }

  return parts.join(' ')
}

function loadLocalTasks(): Task[] {
  const saved =
    localStorage.getItem(
      'mySchedulerTasks'
    )

  if (!saved) {
    return []
  }

  try {
    return JSON.parse(
      saved
    ) as Task[]
  } catch {
    return []
  }
}

function saveLocalTask(
  task: Task
) {
  const existing =
    loadLocalTasks()

  const withoutDuplicate =
    existing.filter(
      item =>
        item.id !== task.id
    )

  const updated = [
    ...withoutDuplicate,
    task,
  ]

  localStorage.setItem(
    'mySchedulerTasks',
    JSON.stringify(updated)
  )
}

export default function AddTaskModal({
  onClose,
  onTaskAdded,
  defaultDueDate = '',
}: AddTaskModalProps) {
  const [title, setTitle] =
    useState('')

  const [subject, setSubject] =
    useState('')

  const [dueDate, setDueDate] =
    useState(defaultDueDate)

  const [
    durationHours,
    setDurationHours,
  ] = useState(0)

  const [
    durationMinutes,
    setDurationMinutes,
  ] = useState(30)

  const [
    priority,
    setPriority,
  ] = useState<
    'high' | 'medium' | 'low'
  >('medium')

  const [error, setError] =
    useState('')

  const [saving, setSaving] =
    useState(false)

  const addTask = async () => {
    const cleanTitle =
      title.trim()

    if (!cleanTitle) {
      setError(
        'Please enter a task name.'
      )
      return
    }

    if (!dueDate) {
      setError(
        'Please select a due date.'
      )
      return
    }

    const safeHours =
      Number.isFinite(
        durationHours
      )
        ? Math.max(
            0,
            durationHours
          )
        : 0

    const safeMinutes =
      Number.isFinite(
        durationMinutes
      )
        ? Math.max(
            0,
            durationMinutes
          )
        : 0

    const totalMinutes =
      Math.floor(
        safeHours
      ) *
        60 +
      Math.floor(
        safeMinutes
      )

    if (
      totalMinutes <= 0
    ) {
      setError(
        'Estimated time must be greater than 0 minutes.'
      )
      return
    }

    setSaving(true)
    setError('')

    try {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        throw new Error(
          'You are not signed in. Please sign in again.'
        )
      }

      const cleanSubject =
        subject.trim() ||
        'Personal'

      const {
        data: savedTask,
        error: insertError,
      } =
        await supabase
          .from('tasks')
          .insert({
            user_id: user.id,
            title: cleanTitle,
            subject: cleanSubject,
            due_date: dueDate,
            duration_minutes:
              totalMinutes,
            priority,
            completed: false,
            completed_at: null,
          })
          .select(
            `
            id,
            title,
            subject,
            due_date,
            duration_minutes,
            priority,
            completed
          `
          )
          .single()

      if (insertError) {
        throw insertError
      }

      if (!savedTask) {
        throw new Error(
          'The task was not returned after saving.'
        )
      }

      const savedDueDate =
        savedTask.due_date
          ? savedTask.due_date.slice(
              0,
              10
            )
          : dueDate

      const savedMinutes =
        savedTask.duration_minutes ??
        totalMinutes

      const savedPriority:
        Task['priority'] =
          savedTask.priority ===
            'high' ||
          savedTask.priority ===
            'low'
            ? savedTask.priority
            : 'medium'

      const newTask: Task = {
        id: savedTask.id,
        title:
          savedTask.title,
        subject:
          savedTask.subject ||
          'Personal',
        dueDate:
          savedDueDate,
        daysUntilDue:
          calculateDaysUntilDue(
            savedDueDate
          ),
        duration:
          buildDuration(
            0,
            savedMinutes
          ),
        priority:
          savedPriority,
        completed:
          savedTask.completed,
      }

      saveLocalTask(
        newTask
      )

      onTaskAdded?.(
        newTask
      )

      onClose()
    } catch (err) {
      console.error(
        'Failed to add task:',
        err
      )

      const message =
        typeof err ===
          'object' &&
        err !== null &&
        'message' in err
          ? String(
              (
                err as {
                  message?: unknown
                }
              ).message
            )
          : ''

      setError(
        message ||
          'The task could not be saved. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  const currentDuration =
    buildDuration(
      durationHours,
      durationMinutes
    )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        onClick={
          saving
            ? undefined
            : onClose
        }
      />

      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display font-700 text-xl text-slate-900 dark:text-white">
              Add Task
            </h2>

            <p className="text-xs text-slate-400 mt-0.5">
              Add something you need to get done.
            </p>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              What do you need to do?
            </label>

            <input
              autoFocus
              type="text"
              value={title}
              onChange={e => {
                setTitle(
                  e.target.value
                )
                setError('')
              }}
              placeholder="e.g. Finish assignment"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Subject or Category
            </label>

            <input
              type="text"
              value={subject}
              onChange={e =>
                setSubject(
                  e.target.value
                )
              }
              placeholder="e.g. Mathematics, Work, Personal"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Due Date
            </label>

            <input
              type="date"
              value={dueDate}
              onChange={e => {
                setDueDate(
                  e.target.value
                )
                setError('')
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Estimated Time
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Hours
                </label>

                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={
                      durationHours
                    }
                    onChange={e => {
                      const value =
                        e.target.value ===
                        ''
                          ? 0
                          : Number(
                              e.target.value
                            )

                      setDurationHours(
                        Number.isNaN(
                          value
                        )
                          ? 0
                          : Math.max(
                              0,
                              value
                            )
                      )

                      setError('')
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pr-12 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    hrs
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Minutes
                </label>

                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={
                      durationMinutes
                    }
                    onChange={e => {
                      const value =
                        e.target.value ===
                        ''
                          ? 0
                          : Number(
                              e.target.value
                            )

                      setDurationMinutes(
                        Number.isNaN(
                          value
                        )
                          ? 0
                          : Math.max(
                              0,
                              value
                            )
                      )

                      setError('')
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pr-12 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    min
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
              <Clock size={12} />

              {currentDuration
                ? `Estimated duration: ${currentDuration}`
                : 'Enter the amount of time this task needs.'}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Priority
            </label>

            <select
              value={priority}
              onChange={e =>
                setPriority(
                  e.target.value as
                    | 'high'
                    | 'medium'
                    | 'low'
                )
              }
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="low">
                Low
              </option>

              <option value="medium">
                Medium
              </option>

              <option value="high">
                High
              </option>
            </select>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2.5">
              <p className="text-xs text-red-600 dark:text-red-400">
                {error}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={addTask}
            disabled={
              saving ||
              !title.trim() ||
              !dueDate ||
              (durationHours <= 0 &&
                durationMinutes <=
                  0)
            }
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            {saving
              ? 'Saving...'
              : 'Add Task'}
          </button>
        </div>
      </div>
    </div>
  )
}