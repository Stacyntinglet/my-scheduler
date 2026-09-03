import { useEffect, useState } from 'react'
import {
  Plus,
  Check,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Calendar,
  Trash2,
  X,
  Pencil,
  CheckSquare,
} from 'lucide-react'

import type { Task } from '../types'
import AddTaskModal from '../components/AddTaskModal'
import { supabase } from '../utils/supabase'

type Tab =
  | 'all'
  | 'today'
  | 'upcoming'
  | 'completed'

type TaskRow = {
  id: string
  title: string
  subject: string | null
  due_date: string | null
  duration_minutes: number | null
  priority: string
  completed: boolean
  completed_at: string | null
}

const PRIORITY_CONFIG = {
  high: {
    label: 'High',
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-600 dark:text-red-400',
  },

  medium: {
    label: 'Medium',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-600 dark:text-amber-400',
  },

  low: {
    label: 'Low',
    bg: 'bg-slate-50 dark:bg-slate-800',
    text: 'text-slate-500 dark:text-slate-400',
  },
}

function calculateDaysUntilDue(
  date: string
) {
  if (!date) {
    return Number.POSITIVE_INFINITY
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due = new Date(
    `${date}T00:00:00`
  )

  due.setHours(0, 0, 0, 0)

  return Math.round(
    (due.getTime() -
      today.getTime()) /
      (1000 * 60 * 60 * 24)
  )
}

function formatDueDate(
  date: string
) {
  if (!date) {
    return 'No deadline'
  }

  const days =
    calculateDaysUntilDue(
      date
    )

  if (days === 0) {
    return 'Today'
  }

  if (days === 1) {
    return 'Tomorrow'
  }

  if (days === -1) {
    return 'Yesterday'
  }

  if (days > 1) {
    return `In ${days} days`
  }

  return `${Math.abs(
    days
  )} days ago`
}

function formatFullDate(
  date: string
) {
  if (!date) {
    return 'No deadline'
  }

  return new Intl.DateTimeFormat(
    'en-US',
    {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }
  ).format(
    new Date(
      `${date}T00:00:00`
    )
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
      Math.floor(minutes)
    )

  const extraHours =
    Math.floor(
      safeMinutes / 60
    )

  const remainingMinutes =
    safeMinutes % 60

  const totalHours =
    safeHours +
    extraHours

  const parts: string[] =
    []

  if (totalHours > 0) {
    parts.push(
      `${totalHours} ${
        totalHours === 1
          ? 'hour'
          : 'hours'
      }`
    )
  }

  if (
    remainingMinutes >
    0
  ) {
    parts.push(
      `${remainingMinutes} min`
    )
  }

  return parts.join(' ')
}

function durationFromMinutes(
  totalMinutes: number | null
) {
  const safeMinutes =
    Math.max(
      0,
      totalMinutes ?? 0
    )

  return (
    buildDuration(
      0,
      safeMinutes
    ) || '0 min'
  )
}

function parseDuration(
  duration: string
) {
  const normalized =
    duration
      .toLowerCase()
      .trim()

  let totalMinutes = 0

  const hourMatch =
    normalized.match(
      /([\d.]+)\s*hour/
    )

  const minuteMatch =
    normalized.match(
      /(\d+)\s*min/
    )

  if (hourMatch) {
    totalMinutes +=
      Math.round(
        Number(
          hourMatch[1]
        ) * 60
      )
  }

  if (minuteMatch) {
    totalMinutes +=
      Number(
        minuteMatch[1]
      )
  }

  if (
    totalMinutes === 0
  ) {
    const numeric =
      Number.parseFloat(
        normalized
      )

    if (
      !Number.isNaN(
        numeric
      )
    ) {
      totalMinutes =
        Math.round(
          numeric
        )
    }
  }

  return {
    hours:
      Math.floor(
        totalMinutes /
          60
      ),

    minutes:
      totalMinutes %
      60,
  }
}

function rowToTask(
  row: TaskRow
): Task {
  const dueDate =
    row.due_date
      ? row.due_date.slice(
          0,
          10
        )
      : ''

  const priority:
    Task['priority'] =
      row.priority ===
        'high' ||
      row.priority ===
        'low'
        ? row.priority
        : 'medium'

  return {
    id: row.id,

    title:
      row.title,

    subject:
      row.subject ||
      'Personal',

    dueDate,

    daysUntilDue:
      calculateDaysUntilDue(
        dueDate
      ),

    duration:
      durationFromMinutes(
        row.duration_minutes
      ),

    priority,

    completed:
      row.completed,
  }
}

function mirrorTasksLocally(
  tasks: Task[]
) {
  localStorage.setItem(
    'mySchedulerTasks',
    JSON.stringify(
      tasks
    )
  )

  window.dispatchEvent(
    new Event(
      'mySchedulerTasksUpdated'
    )
  )
}

interface TaskCardProps {
  task: Task
  onToggle: (
    id: string
  ) => void
  onDelete: (
    task: Task
  ) => void
  onOpen: (
    task: Task
  ) => void
  onReschedule: (
    task: Task
  ) => void
}

function TaskCard({
  task,
  onToggle,
  onDelete,
  onOpen,
  onReschedule,
}: TaskCardProps) {
  const [
    showMenu,
    setShowMenu,
  ] =
    useState(false)

  const priority =
    PRIORITY_CONFIG[
      task.priority
    ]

  const currentDaysUntilDue =
    calculateDaysUntilDue(
      task.dueDate
    )

  return (
    <div
      onClick={() =>
        onOpen(task)
      }
      className={`group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-start gap-3 hover:shadow-sm transition-all cursor-pointer ${
        task.completed
          ? 'opacity-55'
          : ''
      }`}
    >
      <button
        type="button"
        onClick={event => {
          event.stopPropagation()

          void onToggle(
            task.id
          )
        }}
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
          task.completed
            ? 'bg-indigo-600 border-indigo-600'
            : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'
        }`}
      >
        {task.completed && (
          <Check
            size={11}
            className="text-white"
            strokeWidth={3}
          />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p
              className={`text-sm font-medium ${
                task.completed
                  ? 'line-through text-slate-400 dark:text-slate-500'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {task.title}
            </p>

            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {task.subject ||
                  'Personal'}
              </span>

              <span className="text-slate-300 dark:text-slate-700">
                ·
              </span>

              <span
                className={`text-xs ${
                  !task.dueDate
                    ? 'text-slate-400 dark:text-slate-500'
                    : currentDaysUntilDue <
                      0
                    ? 'text-red-500'
                    : currentDaysUntilDue <=
                      2
                    ? 'text-amber-500'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {!task.dueDate
                  ? 'No deadline'
                  : currentDaysUntilDue <
                    0
                  ? `${Math.abs(
                      currentDaysUntilDue
                    )}d overdue`
                  : formatDueDate(
                      task.dueDate
                    )}
              </span>

              <span className="text-slate-300 dark:text-slate-700">
                ·
              </span>

              <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                <Clock
                  size={10}
                />
                {
                  task.duration
                }
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${priority.bg} ${priority.text}`}
            >
              {
                priority.label
              }
            </span>

            <div className="relative">
              <button
                type="button"
                onClick={event => {
                  event.stopPropagation()

                  setShowMenu(
                    value =>
                      !value
                  )
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-all"
              >
                <MoreHorizontal
                  size={14}
                />
              </button>

              {showMenu && (
                <div
                  onClick={event =>
                    event.stopPropagation()
                  }
                  className="absolute right-0 top-8 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => {
                      void onToggle(
                        task.id
                      )

                      setShowMenu(
                        false
                      )
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Check
                      size={13}
                    />

                    {task.completed
                      ? 'Mark incomplete'
                      : 'Mark complete'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onReschedule(
                        task
                      )

                      setShowMenu(
                        false
                      )
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Calendar
                      size={13}
                    />
                    Reschedule
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onDelete(
                        task
                      )

                      setShowMenu(
                        false
                      )
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2
                      size={13}
                    />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TasksView() {
  const [
    tab,
    setTab,
  ] =
    useState<Tab>(
      'all'
    )

  const [
    tasks,
    setTasks,
  ] =
    useState<Task[]>(
      []
    )

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    pageError,
    setPageError,
  ] =
    useState('')

  const [
    showAddTask,
    setShowAddTask,
  ] =
    useState(false)

  const [
    selectedTask,
    setSelectedTask,
  ] =
    useState<Task | null>(
      null
    )

  const [
    editingTask,
    setEditingTask,
  ] =
    useState<Task | null>(
      null
    )

  const [
    taskPendingDelete,
    setTaskPendingDelete,
  ] =
    useState<Task | null>(
      null
    )

  const [
    editTitle,
    setEditTitle,
  ] =
    useState('')

  const [
    editSubject,
    setEditSubject,
  ] =
    useState('')

  const [
    editDueDate,
    setEditDueDate,
  ] =
    useState('')

  const [
    editDurationHours,
    setEditDurationHours,
  ] =
    useState(0)

  const [
    editDurationMinutes,
    setEditDurationMinutes,
  ] =
    useState(30)

  const [
    editPriority,
    setEditPriority,
  ] =
    useState<
      | 'high'
      | 'medium'
      | 'low'
    >('medium')

  const [
    editError,
    setEditError,
  ] =
    useState('')

  const [
    savingEdit,
    setSavingEdit,
  ] =
    useState(false)

  const [
    deletingTask,
    setDeletingTask,
  ] =
    useState(false)

  const loadTasksFromSupabase =
    async () => {
      setLoading(true)
      setPageError('')

      try {
        const {
          data: {
            user,
          },
          error:
            userError,
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

        const {
          data,
          error,
        } =
          await supabase
            .from(
              'tasks'
            )
            .select(
              `
              id,
              title,
              subject,
              due_date,
              duration_minutes,
              priority,
              completed,
              completed_at
            `
            )
            .eq(
              'user_id',
              user.id
            )
            .order(
              'created_at',
              {
                ascending:
                  false,
              }
            )

        if (error) {
          throw error
        }

        const loadedTasks =
          (
            data ??
            []
          ).map(
            row =>
              rowToTask(
                row as TaskRow
              )
          )

        setTasks(
          loadedTasks
        )

        mirrorTasksLocally(
          loadedTasks
        )
      } catch (error) {
        console.error(
          'Failed to load tasks:',
          error
        )

        setPageError(
          error instanceof Error
            ? error.message
            : 'Could not load your tasks.'
        )
      } finally {
        setLoading(false)
      }
    }

  useEffect(() => {
    void loadTasksFromSupabase()
  }, [])

  const refreshTasks =
    () => {
      void loadTasksFromSupabase()
    }

  const toggleTask =
    async (
      id: string
    ) => {
      const task =
        tasks.find(
          item =>
            item.id ===
            id
        )

      if (!task) {
        return
      }

      const nextCompleted =
        !task.completed

      setPageError('')

      try {
        const {
          data: {
            user,
          },
          error:
            userError,
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

        const {
          error,
        } =
          await supabase
            .from(
              'tasks'
            )
            .update({
              completed:
                nextCompleted,

              completed_at:
                nextCompleted
                  ? new Date().toISOString()
                  : null,
            })
            .eq(
              'id',
              id
            )
            .eq(
              'user_id',
              user.id
            )

        if (error) {
          throw error
        }

        const updatedTasks =
          tasks.map(
            currentTask =>
              currentTask.id ===
              id
                ? {
                    ...currentTask,
                    completed:
                      nextCompleted,
                  }
                : currentTask
          )

        setTasks(
          updatedTasks
        )

        mirrorTasksLocally(
          updatedTasks
        )

        if (
          selectedTask?.id ===
          id
        ) {
          const updatedSelected =
            updatedTasks.find(
              currentTask =>
                currentTask.id ===
                id
            )

          setSelectedTask(
            updatedSelected ??
              null
          )
        }
      } catch (error) {
        console.error(
          'Failed to update task:',
          error
        )

        setPageError(
          error instanceof Error
            ? error.message
            : 'Could not update the task.'
        )
      }
    }

  const requestDeleteTask = (
    task: Task
  ) => {
    setTaskPendingDelete(
      task
    )
  }

  const deleteTask =
    async (
      id: string
    ) => {
      setDeletingTask(
        true
      )

      setPageError('')

      try {
        const {
          data: {
            user,
          },
          error:
            userError,
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

        const {
          error,
        } =
          await supabase
            .from(
              'tasks'
            )
            .delete()
            .eq(
              'id',
              id
            )
            .eq(
              'user_id',
              user.id
            )

        if (error) {
          throw error
        }

        const updatedTasks =
          tasks.filter(
            task =>
              task.id !==
              id
          )

        setTasks(
          updatedTasks
        )

        mirrorTasksLocally(
          updatedTasks
        )

        if (
          selectedTask?.id ===
          id
        ) {
          setSelectedTask(
            null
          )
        }

        if (
          editingTask?.id ===
          id
        ) {
          setEditingTask(
            null
          )
        }

        setTaskPendingDelete(
          null
        )
      } catch (error) {
        console.error(
          'Failed to delete task:',
          error
        )

        setPageError(
          error instanceof Error
            ? error.message
            : 'Could not delete the task.'
        )
      } finally {
        setDeletingTask(
          false
        )
      }
    }

  const confirmDeleteTask =
    () => {
      if (
        !taskPendingDelete
      ) {
        return
      }

      void deleteTask(
        taskPendingDelete.id
      )
    }

  const openTaskDetails =
    (task: Task) => {
      setSelectedTask(
        task
      )
    }

  const openTaskEditor =
    (task: Task) => {
      const parsedDuration =
        parseDuration(
          task.duration
        )

      setEditingTask(
        task
      )

      setEditTitle(
        task.title
      )

      setEditSubject(
        task.subject
      )

      setEditDueDate(
        task.dueDate
      )

      setEditDurationHours(
        parsedDuration.hours
      )

      setEditDurationMinutes(
        parsedDuration.minutes
      )

      setEditPriority(
        task.priority
      )

      setEditError('')

      setSelectedTask(
        null
      )
    }

  const closeTaskEditor =
    () => {
      if (
        savingEdit
      ) {
        return
      }

      setEditingTask(
        null
      )

      setEditError('')
    }

  const saveTaskChanges =
    async () => {
      if (!editingTask) {
        return
      }

      const cleanTitle =
        editTitle.trim()

      if (!cleanTitle) {
        setEditError(
          'Please enter a task name.'
        )

        return
      }

      if (!editDueDate) {
        setEditError(
          'Please select a due date.'
        )

        return
      }

      const totalMinutes =
        Math.floor(
          Math.max(
            0,
            editDurationHours
          )
        ) *
          60 +
        Math.floor(
          Math.max(
            0,
            editDurationMinutes
          )
        )

      if (
        totalMinutes <=
        0
      ) {
        setEditError(
          'Estimated time must be greater than 0 minutes.'
        )

        return
      }

      setSavingEdit(
        true
      )

      setEditError('')

      try {
        const {
          data: {
            user,
          },
          error:
            userError,
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
          editSubject.trim() ||
          'Personal'

        const {
          error,
        } =
          await supabase
            .from(
              'tasks'
            )
            .update({
              title:
                cleanTitle,

              subject:
                cleanSubject,

              due_date:
                editDueDate,

              duration_minutes:
                totalMinutes,

              priority:
                editPriority,
            })
            .eq(
              'id',
              editingTask.id
            )
            .eq(
              'user_id',
              user.id
            )

        if (error) {
          throw error
        }

        const updatedTask:
          Task = {
          ...editingTask,

          title:
            cleanTitle,

          subject:
            cleanSubject,

          dueDate:
            editDueDate,

          daysUntilDue:
            calculateDaysUntilDue(
              editDueDate
            ),

          duration:
            buildDuration(
              editDurationHours,
              editDurationMinutes
            ),

          priority:
            editPriority,
        }

        const updatedTasks =
          tasks.map(
            task =>
              task.id ===
              editingTask.id
                ? updatedTask
                : task
          )

        setTasks(
          updatedTasks
        )

        mirrorTasksLocally(
          updatedTasks
        )

        setEditingTask(
          null
        )

        setSelectedTask(
          updatedTask
        )
      } catch (error) {
        console.error(
          'Failed to edit task:',
          error
        )

        setEditError(
          error instanceof Error
            ? error.message
            : 'Could not save the changes.'
        )
      } finally {
        setSavingEdit(
          false
        )
      }
    }

  const tasksWithCurrentDates =
    tasks.map(
      task => ({
        ...task,

        daysUntilDue:
          calculateDaysUntilDue(
            task.dueDate
          ),
      })
    )

  const filtered =
    tasksWithCurrentDates.filter(
      task => {
        if (
          tab === 'all'
        ) {
          return true
        }

        if (
          tab === 'today'
        ) {
          return (
            !task.completed &&
            task.dueDate !==
              '' &&
            task.daysUntilDue ===
              0
          )
        }

        if (
          tab ===
          'upcoming'
        ) {
          return (
            !task.completed &&
            task.dueDate !==
              '' &&
            task.daysUntilDue >
              0
          )
        }

        if (
          tab ===
          'completed'
        ) {
          return task.completed
        }

        return true
      }
    )

  const tabCounts = {
    all:
      tasksWithCurrentDates.length,

    today:
      tasksWithCurrentDates.filter(
        task =>
          !task.completed &&
          task.dueDate !==
            '' &&
          task.daysUntilDue ===
            0
      ).length,

    upcoming:
      tasksWithCurrentDates.filter(
        task =>
          !task.completed &&
          task.dueDate !==
            '' &&
          task.daysUntilDue >
            0
      ).length,

    completed:
      tasksWithCurrentDates.filter(
        task =>
          task.completed
      ).length,
  }

  const remainingTasks =
    tasks.filter(
      task =>
        !task.completed
    ).length

  const overdueTasks =
    tasksWithCurrentDates.filter(
      task =>
        !task.completed &&
        task.dueDate !==
          '' &&
        task.daysUntilDue <
          0
    )

  const currentEditDuration =
    buildDuration(
      editDurationHours,
      editDurationMinutes
    )

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-800 text-2xl text-slate-900 dark:text-white">
            Tasks
          </h1>

          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {loading
              ? 'Loading your tasks...'
              : `${remainingTasks} ${
                  remainingTasks === 1
                    ? 'task remaining'
                    : 'tasks remaining'
                }`}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setShowAddTask(
              true
            )
          }
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <Plus
            size={14}
          />
          Add Task
        </button>
      </div>

      {pageError && (
        <div className="mb-5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertCircle
            size={16}
            className="text-red-500 flex-shrink-0 mt-0.5"
          />

          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              Could not update your tasks
            </p>

            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              {pageError}
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-6">
        {(
          [
            'all',
            'today',
            'upcoming',
            'completed',
          ] as Tab[]
        ).map(
          currentTab => (
            <button
              type="button"
              key={
                currentTab
              }
              onClick={() =>
                setTab(
                  currentTab
                )
              }
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                tab ===
                currentTab
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {
                currentTab
              }

              {tabCounts[
                currentTab
              ] > 0 && (
                <span
                  className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
                    tab ===
                    currentTab
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}
                >
                  {
                    tabCounts[
                      currentTab
                    ]
                  }
                </span>
              )}
            </button>
          )
        )}
      </div>

      {loading ? (
        <div className="text-center py-16">
          <Clock
            size={24}
            className="mx-auto text-indigo-500 mb-3"
          />

          <p className="text-slate-600 dark:text-slate-400 font-medium">
            Loading your tasks...
          </p>
        </div>
      ) : filtered.length ===
        0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
            <Check
              size={22}
              className="text-slate-400"
            />
          </div>

          <p className="text-slate-600 dark:text-slate-400 font-medium">
            {tab ===
            'completed'
              ? 'No completed tasks yet'
              : tab ===
                'today'
              ? 'Nothing due today'
              : tab ===
                'upcoming'
              ? 'Nothing upcoming'
              : 'No tasks yet'}
          </p>

          <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
            {tab ===
            'all'
              ? 'Add your first task to start planning your day.'
              : 'Tasks matching this filter will appear here.'}
          </p>

          {tab ===
            'all' && (
            <button
              type="button"
              onClick={() =>
                setShowAddTask(
                  true
                )
              }
              className="inline-flex items-center gap-1.5 mt-4 text-indigo-600 dark:text-indigo-400 text-sm font-semibold"
            >
              <Plus
                size={14}
              />
              Add your first task
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {tab ===
            'all' &&
            overdueTasks.length >
              0 && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle
                    size={13}
                    className="text-red-500"
                  />

                  <span className="text-xs font-semibold text-red-500 uppercase tracking-wide">
                    Overdue
                  </span>
                </div>

                <div className="space-y-2.5">
                  {overdueTasks.map(
                    task => (
                      <TaskCard
                        key={
                          task.id
                        }
                        task={
                          task
                        }
                        onToggle={
                          toggleTask
                        }
                        onDelete={
                          requestDeleteTask
                        }
                        onOpen={
                          openTaskDetails
                        }
                        onReschedule={
                          openTaskEditor
                        }
                      />
                    )
                  )}
                </div>
              </div>
            )}

          {filtered
            .filter(
              task => {
                if (
                  tab !==
                  'all'
                ) {
                  return true
                }

                if (
                  task.completed
                ) {
                  return true
                }

                if (
                  !task.dueDate
                ) {
                  return true
                }

                return (
                  task.daysUntilDue >=
                  0
                )
              }
            )
            .map(
              task => (
                <TaskCard
                  key={
                    task.id
                  }
                  task={
                    task
                  }
                  onToggle={
                    toggleTask
                  }
                  onDelete={
                    requestDeleteTask
                  }
                  onOpen={
                    openTaskDetails
                  }
                  onReschedule={
                    openTaskEditor
                  }
                />
              )
            )}
        </div>
      )}

      {showAddTask && (
        <AddTaskModal
          onClose={() =>
            setShowAddTask(
              false
            )
          }
          onTaskAdded={() =>
            refreshTasks()
          }
        />
      )}

      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() =>
              setSelectedTask(
                null
              )
            }
          />

          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6">

            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckSquare
                    size={14}
                    className="text-indigo-500"
                  />

                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Task
                  </span>
                </div>

                <h2
                  className={`font-display font-700 text-xl ${
                    selectedTask.completed
                      ? 'line-through text-slate-400'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {
                    selectedTask.title
                  }
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedTask(
                    null
                  )
                }
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X
                  size={16}
                />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400">
                  Subject / Category
                </p>

                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {selectedTask.subject ||
                    'Personal'}
                </p>
              </div>

              <div className="flex items-start gap-3">
                <Calendar
                  size={16}
                  className="text-slate-400 mt-0.5"
                />

                <div>
                  <p className="text-xs text-slate-400">
                    Due date
                  </p>

                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {formatFullDate(
                      selectedTask.dueDate
                    )}
                  </p>

                  <p
                    className={`text-xs mt-0.5 ${
                      calculateDaysUntilDue(
                        selectedTask.dueDate
                      ) < 0
                        ? 'text-red-500'
                        : 'text-slate-400'
                    }`}
                  >
                    {formatDueDate(
                      selectedTask.dueDate
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock
                  size={16}
                  className="text-slate-400 mt-0.5"
                />

                <div>
                  <p className="text-xs text-slate-400">
                    Estimated time
                  </p>

                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {
                      selectedTask.duration
                    }
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-1.5">
                  Priority
                </p>

                <span
                  className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full ${
                    PRIORITY_CONFIG[
                      selectedTask.priority
                    ].bg
                  } ${
                    PRIORITY_CONFIG[
                      selectedTask.priority
                    ].text
                  }`}
                >
                  {
                    PRIORITY_CONFIG[
                      selectedTask.priority
                    ].label
                  }
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-6">
              <button
                type="button"
                onClick={() =>
                  openTaskEditor(
                    selectedTask
                  )
                }
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-sm font-medium"
              >
                <Pencil
                  size={14}
                />
                Edit Task
              </button>

              <button
                type="button"
                onClick={() =>
                  void toggleTask(
                    selectedTask.id
                  )
                }
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-sm font-medium"
              >
                <Check
                  size={14}
                />

                {selectedTask.completed
                  ? 'Mark Incomplete'
                  : 'Complete'}
              </button>

              <button
                type="button"
                onClick={() =>
                  requestDeleteTask(
                    selectedTask
                  )
                }
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium"
              >
                <Trash2
                  size={14}
                />
                Delete
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedTask(
                    null
                  )
                }
                className="flex-1 min-w-24 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 px-4 rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={
              closeTaskEditor
            }
          />

          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6">

            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display font-700 text-xl text-slate-900 dark:text-white">
                  Edit Task
                </h2>

                <p className="text-xs text-slate-400 mt-0.5">
                  Update the task or move it to another date.
                </p>
              </div>

              <button
                type="button"
                disabled={
                  savingEdit
                }
                onClick={
                  closeTaskEditor
                }
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <X
                  size={16}
                />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Task Name
                </label>

                <input
                  autoFocus
                  type="text"
                  value={
                    editTitle
                  }
                  onChange={event => {
                    setEditTitle(
                      event.target.value
                    )

                    setEditError('')
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Subject or Category
                </label>

                <input
                  type="text"
                  value={
                    editSubject
                  }
                  onChange={event =>
                    setEditSubject(
                      event.target.value
                    )
                  }
                  placeholder="e.g. Mathematics, Work, Personal"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Due Date
                </label>

                <input
                  type="date"
                  value={
                    editDueDate
                  }
                  onChange={event => {
                    setEditDueDate(
                      event.target.value
                    )

                    setEditError('')
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
                          editDurationHours
                        }
                        onChange={event => {
                          const value =
                            event.target.value ===
                            ''
                              ? 0
                              : Number(
                                  event.target.value
                                )

                          setEditDurationHours(
                            Number.isNaN(
                              value
                            )
                              ? 0
                              : Math.max(
                                  0,
                                  value
                                )
                          )

                          setEditError('')
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
                          editDurationMinutes
                        }
                        onChange={event => {
                          const value =
                            event.target.value ===
                            ''
                              ? 0
                              : Number(
                                  event.target.value
                                )

                          setEditDurationMinutes(
                            Number.isNaN(
                              value
                            )
                              ? 0
                              : Math.max(
                                  0,
                                  value
                                )
                          )

                          setEditError('')
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pr-12 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

                  {currentEditDuration
                    ? `Estimated duration: ${currentEditDuration}`
                    : 'Enter the amount of time this task needs.'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Priority
                </label>

                <select
                  value={
                    editPriority
                  }
                  onChange={event =>
                    setEditPriority(
                      event.target.value as
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

              {editError && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {
                      editError
                    }
                  </p>
                </div>
              )}

              <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-xl px-4 py-3">
                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                  Changing the duration affects how much space Auto Plan needs to find for this task in My Day.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                disabled={
                  savingEdit
                }
                onClick={
                  closeTaskEditor
                }
                className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  void saveTaskChanges()
                }
                disabled={
                  savingEdit ||
                  !editTitle.trim() ||
                  !editDueDate ||
                  (
                    editDurationHours <=
                      0 &&
                    editDurationMinutes <=
                      0
                  )
                }
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl"
              >
                {savingEdit
                  ? 'Saving...'
                  : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {taskPendingDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">

          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => {
              if (
                !deletingTask
              ) {
                setTaskPendingDelete(
                  null
                )
              }
            }}
          />

          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">

            <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-4">
              <Trash2
                size={20}
                className="text-red-600 dark:text-red-400"
              />
            </div>

            <h2 className="font-display font-700 text-xl text-slate-900 dark:text-white">
              Delete task?
            </h2>

            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                “{
                  taskPendingDelete.title
                }”
              </span>
              ? This action cannot be undone.
            </p>

            <div className="flex gap-3 mt-6">

              <button
                type="button"
                disabled={
                  deletingTask
                }
                onClick={() =>
                  setTaskPendingDelete(
                    null
                  )
                }
                className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  deletingTask
                }
                onClick={
                  confirmDeleteTask
                }
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                <Trash2
                  size={14}
                />

                {deletingTask
                  ? 'Deleting...'
                  : 'Delete Task'}
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}