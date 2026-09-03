import { useState } from 'react'
import {
  X,
  Clock,
  Calendar,
  Zap,
  ChevronDown,
  Check,
} from 'lucide-react'

import type { Task } from '../types'
import { supabase } from '../utils/supabase'

interface QuickAddModalProps {
  onClose: () => void
  onTaskAdded?: (task: Task) => void
}

const CATEGORIES = [
  'Academic',
  'Study',
  'Personal',
  'Task',
  'Event',
  'Fitness',
]

type Priority =
  | 'high'
  | 'medium'
  | 'low'

type SchedulingType =
  | 'fixed'
  | 'flexible'

interface SavedTaskRow {
  id: string
  title: string
  subject: string | null
  due_date: string | null
  duration_minutes: number | null
  priority: Priority
  completed: boolean
  scheduling_type: SchedulingType
  scheduled_date: string | null
  scheduled_time: string | null
}

function calculateDaysUntilDue(
  date: string
) {
  if (!date) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due = new Date(
    `${date}T00:00:00`
  )

  due.setHours(0, 0, 0, 0)

  return Math.round(
    (
      due.getTime() -
      today.getTime()
    ) /
      (
        1000 *
        60 *
        60 *
        24
      )
  )
}

function loadTasks(): Task[] {
  const saved =
    localStorage.getItem(
      'mySchedulerTasks'
    )

  if (!saved) return []

  try {
    return JSON.parse(
      saved
    ) as Task[]
  } catch {
    return []
  }
}

function mirrorTaskLocally(
  task: Task
) {
  const existingTasks =
    loadTasks()

  const withoutDuplicate =
    existingTasks.filter(
      existingTask =>
        existingTask.id !==
        task.id
    )

  localStorage.setItem(
    'mySchedulerTasks',
    JSON.stringify([
      ...withoutDuplicate,
      task,
    ])
  )
}

function buildDuration(
  hours: number,
  minutes: number
) {
  const safeHours =
    Math.max(
      0,
      Math.floor(hours)
    )

  const safeMinutes =
    Math.max(
      0,
      Math.min(
        59,
        Math.floor(minutes)
      )
    )

  if (
    safeHours === 0 &&
    safeMinutes === 0
  ) {
    return '0 min'
  }

  if (safeHours === 0) {
    return `${safeMinutes} min`
  }

  const hourText =
    safeHours === 1
      ? '1 hour'
      : `${safeHours} hours`

  if (safeMinutes === 0) {
    return hourText
  }

  return `${hourText} ${safeMinutes} min`
}

function formatDurationPreview(
  hours: number,
  minutes: number
) {
  const total =
    Math.max(
      0,
      Math.floor(hours)
    ) *
      60 +
    Math.max(
      0,
      Math.min(
        59,
        Math.floor(minutes)
      )
    )

  if (total === 0) {
    return '0 min'
  }

  const wholeHours =
    Math.floor(
      total / 60
    )

  const remainingMinutes =
    total % 60

  if (wholeHours === 0) {
    return `${remainingMinutes} min`
  }

  if (remainingMinutes === 0) {
    return wholeHours === 1
      ? '1 hour'
      : `${wholeHours} hours`
  }

  return `${wholeHours}h ${remainingMinutes}m`
}

export default function QuickAddModal({
  onClose,
  onTaskAdded,
}: QuickAddModalProps) {
  const [
    title,
    setTitle,
  ] = useState('')

  const [
    category,
    setCategory,
  ] = useState(
    'Academic'
  )

  const [
    priority,
    setPriority,
  ] =
    useState<Priority>(
      'medium'
    )

  const [
    durationHours,
    setDurationHours,
  ] = useState(0)

  const [
    durationMinutes,
    setDurationMinutes,
  ] = useState(45)

  const [
    deadline,
    setDeadline,
  ] = useState('')

  const [
    scheduling,
    setScheduling,
  ] =
    useState<SchedulingType>(
      'flexible'
    )

  const [
    fixedDate,
    setFixedDate,
  ] = useState('')

  const [
    fixedTime,
    setFixedTime,
  ] = useState('14:00')

  const [
    showSuggestion,
    setShowSuggestion,
  ] = useState(false)

  const [
    saved,
    setSaved,
  ] = useState(false)

  const [
    saving,
    setSaving,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const duration =
    buildDuration(
      durationHours,
      durationMinutes
    )

  const handleSchedulingChange = (
    type: SchedulingType
  ) => {
    setScheduling(type)
    setError('')

    if (
      type ===
      'flexible'
    ) {
      setShowSuggestion(true)
    } else {
      setShowSuggestion(false)
    }
  }

  const saveTask = async () => {
    const cleanTitle =
      title.trim()

    if (!cleanTitle) {
      setError(
        'Please enter a task name.'
      )
      return
    }

    const totalDurationMinutes =
      durationHours * 60 +
      durationMinutes

    if (
      totalDurationMinutes <= 0
    ) {
      setError(
        'Please enter a duration greater than 0 minutes.'
      )
      return
    }

    if (
      scheduling === 'fixed' &&
      (
        !fixedDate ||
        !fixedTime
      )
    ) {
      setError(
        'Please select a date and time for this task.'
      )
      return
    }

    setSaving(true)
    setError('')

    try {
      const {
        data: {
          user,
        },
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

      const taskDueDate =
        deadline ||
        (
          scheduling === 'fixed'
            ? fixedDate
            : ''
        )

      const {
        data,
        error: insertError,
      } =
        await supabase
          .from('tasks')
          .insert({
            user_id:
              user.id,

            title:
              cleanTitle,

            subject:
              category,

            due_date:
              taskDueDate ||
              null,

            duration_minutes:
              totalDurationMinutes,

            priority,

            completed:
              false,

            completed_at:
              null,

            scheduling_type:
              scheduling,

            scheduled_date:
              scheduling ===
              'fixed'
                ? fixedDate
                : null,

            scheduled_time:
              scheduling ===
              'fixed'
                ? fixedTime
                : null,
          })
          .select(
            `
              id,
              title,
              subject,
              due_date,
              duration_minutes,
              priority,
              completed,
              scheduling_type,
              scheduled_date,
              scheduled_time
            `
          )
          .single()

      if (insertError) {
        throw insertError
      }

      const savedTask =
        data as SavedTaskRow

      const dueDate =
        savedTask.due_date
          ? savedTask.due_date.slice(
              0,
              10
            )
          : ''

      const savedDurationMinutes =
        savedTask.duration_minutes ??
        totalDurationMinutes

      const newTask: Task = {
        id:
          savedTask.id,

        title:
          savedTask.title,

        subject:
          savedTask.subject ||
          category,

        dueDate,

        daysUntilDue:
          calculateDaysUntilDue(
            dueDate
          ),

        duration:
          buildDuration(
            Math.floor(
              savedDurationMinutes /
                60
            ),
            savedDurationMinutes %
              60
          ),

        priority:
          savedTask.priority,

        completed:
          savedTask.completed,
      }

      /*
       * Temporary compatibility mirror.
       *
       * The TASK itself is still mirrored locally
       * because a few remaining screens may still
       * read mySchedulerTasks.
       *
       */
      mirrorTaskLocally(
        newTask
      )

      onTaskAdded?.(
        newTask
      )

      setSaved(true)

      setTimeout(() => {
        onClose()
      }, 500)
    } catch (err) {
      console.error(
        'Failed to save task:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'The task could not be saved. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={
          saving
            ? undefined
            : onClose
        }
      />

      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">

        <div className="flex items-center justify-between px-6 pt-6 pb-5">

          <div>
            <h2 className="font-display font-700 text-xl text-slate-900 dark:text-white">
              Quick Add
            </h2>

            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              Add something to your scheduler.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              saving
            }
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
          >
            <X
              size={15}
            />
          </button>

        </div>

        <div className="px-6 pb-6 space-y-4">

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Task
            </label>

            <input
              value={
                title
              }
              onChange={e => {
                setTitle(
                  e.target.value
                )

                setError('')
              }}
              placeholder="e.g. Finish Database Assignment"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              autoFocus
              disabled={
                saving
              }
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Category
            </label>

            <div className="relative">

              <select
                value={
                  category
                }
                onChange={e =>
                  setCategory(
                    e.target.value
                  )
                }
                className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-9"
                disabled={
                  saving
                }
              >
                {CATEGORIES.map(
                  item => (
                    <option
                      key={
                        item
                      }
                      value={
                        item
                      }
                    >
                      {
                        item
                      }
                    </option>
                  )
                )}
              </select>

              <ChevronDown
                size={13}
                className="absolute right-3 top-3 text-slate-400 pointer-events-none"
              />

            </div>
          </div>

          <div>

            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Duration
            </label>

            <div className="grid grid-cols-2 gap-3">

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Hours
                </label>

                <div className="relative">

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      durationHours
                    }
                    onChange={e => {
                      const value =
                        Number(
                          e.target.value
                        )

                      setDurationHours(
                        Number.isNaN(
                          value
                        )
                          ? 0
                          : Math.max(
                              0,
                              Math.floor(
                                value
                              )
                            )
                      )

                      setError('')
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 pr-10 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={
                      saving
                    }
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
                    min="0"
                    max="59"
                    step="1"
                    value={
                      durationMinutes
                    }
                    onChange={e => {
                      const value =
                        Number(
                          e.target.value
                        )

                      if (
                        Number.isNaN(
                          value
                        )
                      ) {
                        setDurationMinutes(
                          0
                        )
                      } else {
                        setDurationMinutes(
                          Math.max(
                            0,
                            Math.min(
                              59,
                              Math.floor(
                                value
                              )
                            )
                          )
                        )
                      }

                      setError('')
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 pr-10 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={
                      saving
                    }
                  />

                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    min
                  </span>

                </div>
              </div>

            </div>

            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">

              <Clock
                size={12}
              />

              Estimated duration:{' '}
              {formatDurationPreview(
                durationHours,
                durationMinutes
              )}

            </div>

          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Priority
            </label>

            <select
              value={
                priority
              }
              onChange={e =>
                setPriority(
                  e.target.value as Priority
                )
              }
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={
                saving
              }
            >
              <option value="high">
                High
              </option>

              <option value="medium">
                Medium
              </option>

              <option value="low">
                Low
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">

              <Calendar
                size={11}
                className="inline mr-1"
              />

              Deadline (optional)

            </label>

            <input
              type="date"
              value={
                deadline
              }
              onChange={e => {
                setDeadline(
                  e.target.value
                )

                setError('')
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={
                saving
              }
            />
          </div>

          <div>

            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              When should this happen?
            </p>

            <div className="grid grid-cols-2 gap-2">

              <button
                type="button"
                onClick={() =>
                  handleSchedulingChange(
                    'fixed'
                  )
                }
                disabled={
                  saving
                }
                className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium transition-all ${
                  scheduling ===
                  'fixed'
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                } disabled:opacity-50`}
              >
                <Clock
                  size={15}
                />

                Fixed Time
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSchedulingChange(
                    'flexible'
                  )
                }
                disabled={
                  saving
                }
                className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium transition-all ${
                  scheduling ===
                  'flexible'
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                } disabled:opacity-50`}
              >
                <Zap
                  size={15}
                />

                Flexible
              </button>

            </div>

          </div>

          {scheduling ===
            'fixed' && (
            <div className="grid grid-cols-2 gap-3">

              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Date
                </label>

                <input
                  type="date"
                  value={
                    fixedDate
                  }
                  onChange={e => {
                    setFixedDate(
                      e.target.value
                    )

                    setError('')
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={
                    saving
                  }
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Time
                </label>

                <input
                  type="time"
                  value={
                    fixedTime
                  }
                  onChange={e => {
                    setFixedTime(
                      e.target.value
                    )

                    setError('')
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={
                    saving
                  }
                />
              </div>

            </div>
          )}

          {scheduling ===
              'flexible' &&
            showSuggestion && (
              <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">

                <div className="flex items-start gap-3">

                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">

                    <Zap
                      size={14}
                      className="text-white"
                    />

                  </div>

                  <div>

                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Flexible task
                    </p>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      This task will be available for My Scheduler to place into a suitable free period.
                    </p>

                  </div>

                </div>

              </div>
            )}

          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2.5">

              <p className="text-xs text-red-600 dark:text-red-400">
                {error}
              </p>

            </div>
          )}

          {saved && (
            <div className="flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 rounded-xl py-3 text-sm font-semibold">

              <Check
                size={15}
              />

              Task added

            </div>
          )}

          {!saved && (
            <button
              type="button"
              onClick={
                saveTask
              }
              disabled={
                !title.trim() ||
                saving
              }
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
            >
              {saving
                ? 'Saving...'
                : scheduling ===
                  'fixed'
                  ? 'Add to Schedule'
                  : 'Add Flexible Task'}
            </button>
          )}

        </div>
      </div>
    </div>
  )
}