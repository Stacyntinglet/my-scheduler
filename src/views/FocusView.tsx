import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  BookOpen,
  Check,
  Clock,
  Volume2,
  VolumeX,
  Bell,
  CheckSquare,
  Target,
  Flame,
  CalendarDays,
  Trash2,
} from 'lucide-react'

import type {
  Task,
} from '../types'

import { supabase } from '../utils/supabase'

interface FocusSession {
  id: string
  subjectId?: string
  subject: string
  taskId?: string
  taskTitle?: string
  topic: string
  durationMinutes: number
  completedAt: string
}

interface DurationParts {
  hours: number
  minutes: number
}

interface SubjectOption {
  id: string
  name: string
}

interface TaskRow {
  id: string
  title: string
  subject: string | null
  due_date: string | null
  duration_minutes: number | null
  priority: string | null
  completed: boolean | null
}

interface FocusSessionRow {
  id: string
  subject_id: string | null
  task_id: string | null
  subject: string
  topic: string
  duration_minutes: number
  completed_at: string
}

const SUBJECT_COLORS = [
  {
    dot: 'bg-indigo-500',
    text:
      'text-indigo-600 dark:text-indigo-400',
  },
  {
    dot: 'bg-violet-500',
    text:
      'text-violet-600 dark:text-violet-400',
  },
  {
    dot: 'bg-blue-500',
    text:
      'text-blue-600 dark:text-blue-400',
  },
  {
    dot: 'bg-cyan-500',
    text:
      'text-cyan-600 dark:text-cyan-400',
  },
  {
    dot: 'bg-emerald-500',
    text:
      'text-emerald-600 dark:text-emerald-400',
  },
  {
    dot: 'bg-amber-500',
    text:
      'text-amber-600 dark:text-amber-400',
  },
  {
    dot: 'bg-rose-500',
    text:
      'text-rose-600 dark:text-rose-400',
  },
]

function calculateDaysUntilDue(
  dueDate: string
) {
  if (!dueDate) {
    return Number.POSITIVE_INFINITY
  }

  const today =
    new Date()

  today.setHours(
    0,
    0,
    0,
    0
  )

  const due =
    new Date(
      `${dueDate}T00:00:00`
    )

  due.setHours(
    0,
    0,
    0,
    0
  )

  return Math.round(
    (
      due.getTime() -
      today.getTime()
    ) /
      86400000
  )
}

function buildTaskDuration(
  totalMinutes:
    number | null
) {
  const safeMinutes =
    Math.max(
      0,
      totalMinutes ?? 0
    )

  if (
    safeMinutes === 0
  ) {
    return '0 min'
  }

  const hours =
    Math.floor(
      safeMinutes / 60
    )

  const minutes =
    safeMinutes % 60

  if (
    hours > 0 &&
    minutes > 0
  ) {
    return `${hours} ${
      hours === 1
        ? 'hour'
        : 'hours'
    } ${minutes} min`
  }

  if (hours > 0) {
    return `${hours} ${
      hours === 1
        ? 'hour'
        : 'hours'
    }`
  }

  return `${minutes} min`
}

function mapTaskRowToTask(
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
    id:
      row.id,

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
      buildTaskDuration(
        row.duration_minutes
      ),

    priority,

    completed:
      Boolean(
        row.completed
      ),
  }
}

function durationToSeconds(
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

  return (
    safeHours * 60 * 60 +
    safeMinutes * 60
  )
}

function durationToMinutes(
  hours: number,
  minutes: number
) {
  return Math.floor(
    durationToSeconds(
      hours,
      minutes
    ) / 60
  )
}

function secondsToClock(
  totalSeconds: number
) {
  const safeSeconds =
    Math.max(
      0,
      Math.floor(
        totalSeconds
      )
    )

  const hours =
    Math.floor(
      safeSeconds / 3600
    )

  const minutes =
    Math.floor(
      (
        safeSeconds %
        3600
      ) / 60
    )

  const seconds =
    safeSeconds % 60

  if (hours > 0) {
    return `${String(
      hours
    ).padStart(
      2,
      '0'
    )}:${String(
      minutes
    ).padStart(
      2,
      '0'
    )}:${String(
      seconds
    ).padStart(
      2,
      '0'
    )}`
  }

  return `${String(
    minutes
  ).padStart(
    2,
    '0'
  )}:${String(
    seconds
  ).padStart(
    2,
    '0'
  )}`
}

function formatMinutes(
  minutes: number
) {
  if (minutes <= 0) {
    return '0 min'
  }

  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours =
    Math.floor(
      minutes / 60
    )

  const remaining =
    minutes % 60

  if (
    remaining === 0
  ) {
    return `${hours} ${
      hours === 1
        ? 'hour'
        : 'hours'
    }`
  }

  return `${hours}h ${remaining}m`
}

function formatSessionTime(
  dateString: string
) {
  const date =
    new Date(
      dateString
    )

  const today =
    new Date()

  const yesterday =
    new Date()

  yesterday.setDate(
    today.getDate() - 1
  )

  const sameDate = (
    a: Date,
    b: Date
  ) =>
    a.getFullYear() ===
      b.getFullYear() &&
    a.getMonth() ===
      b.getMonth() &&
    a.getDate() ===
      b.getDate()

  const time =
    new Intl.DateTimeFormat(
      'en-US',
      {
        hour:
          'numeric',
        minute:
          '2-digit',
      }
    ).format(date)

  if (
    sameDate(
      date,
      today
    )
  ) {
    return `Today, ${time}`
  }

  if (
    sameDate(
      date,
      yesterday
    )
  ) {
    return `Yesterday, ${time}`
  }

  return new Intl.DateTimeFormat(
    'en-US',
    {
      month:
        'short',
      day:
        'numeric',
      hour:
        'numeric',
      minute:
        '2-digit',
    }
  ).format(date)
}

function getMonday(
  date: Date
) {
  const result =
    new Date(date)

  result.setHours(
    0,
    0,
    0,
    0
  )

  const day =
    result.getDay()

  const difference =
    day === 0
      ? -6
      : 1 - day

  result.setDate(
    result.getDate() +
      difference
  )

  return result
}

function isThisWeek(
  dateString: string
) {
  const date =
    new Date(
      dateString
    )

  const start =
    getMonday(
      new Date()
    )

  const end =
    new Date(start)

  end.setDate(
    end.getDate() +
      7
  )

  return (
    date >= start &&
    date < end
  )
}

function getDateKey(
  date: Date
) {
  const year =
    date.getFullYear()

  const month =
    String(
      date.getMonth() +
        1
    ).padStart(
      2,
      '0'
    )

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    )

  return `${year}-${month}-${day}`
}

function getFocusStreak(
  sessions:
    FocusSession[]
) {
  if (
    sessions.length ===
    0
  ) {
    return 0
  }

  const activeDays =
    new Set(
      sessions.map(
        session =>
          getDateKey(
            new Date(
              session.completedAt
            )
          )
      )
    )

  const today =
    new Date()

  today.setHours(
    0,
    0,
    0,
    0
  )

  if (
    !activeDays.has(
      getDateKey(today)
    )
  ) {
    today.setDate(
      today.getDate() -
        1
    )
  }

  let streak = 0

  const cursor =
    new Date(today)

  while (
    activeDays.has(
      getDateKey(
        cursor
      )
    )
  ) {
    streak += 1

    cursor.setDate(
      cursor.getDate() -
        1
    )
  }

  return streak
}

function normalizeDuration(
  hours: number,
  minutes: number
): DurationParts {
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

  return {
    hours:
      safeHours +
      Math.floor(
        safeMinutes / 60
      ),

    minutes:
      safeMinutes % 60,
  }
}

export default function FocusView() {
  const [
    subjects,
    setSubjects,
  ] =
    useState<
      SubjectOption[]
    >([])

  const [
    tasks,
    setTasks,
  ] =
    useState<Task[]>(
      []
    )

  const [
    focusSessions,
    setFocusSessions,
  ] =
    useState<
      FocusSession[]
    >([])

  const [
    dataLoading,
    setDataLoading,
  ] =
    useState(true)

  const [
    selectedSubject,
    setSelectedSubject,
  ] =
    useState(
      'Personal'
    )

  const [
    selectedTaskId,
    setSelectedTaskId,
  ] =
    useState('')

  const [
    customTopic,
    setCustomTopic,
  ] =
    useState('')

  const [
    durationHours,
    setDurationHours,
  ] =
    useState(0)

  const [
    durationMinutes,
    setDurationMinutes,
  ] =
    useState(45)

  const [
    timeLeft,
    setTimeLeft,
  ] =
    useState(
      durationToSeconds(
        0,
        45
      )
    )

  const [
    running,
    setRunning,
  ] =
    useState(false)

  const [
    completed,
    setCompleted,
  ] =
    useState(false)

  const [
    soundEnabled,
    setSoundEnabled,
  ] =
    useState(true)

  const [
    error,
    setError,
  ] =
    useState('')

  const [
    savingSession,
    setSavingSession,
  ] =
    useState(false)

  const [
    clearingHistory,
    setClearingHistory,
  ] =
    useState(false)

  const intervalRef =
    useRef<
      ReturnType<
        typeof setInterval
      > | null
    >(null)

  const endTimeRef =
    useRef<
      number | null
    >(null)

  const completionSavedRef =
    useRef(false)

  const loadFocusData =
    async () => {
      setDataLoading(
        true
      )

      setError('')

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

        const [
          subjectsResult,
          tasksResult,
          sessionsResult,
        ] =
          await Promise.all([
            supabase
              .from(
                'subjects'
              )
              .select(
                'id, name'
              )
              .eq(
                'user_id',
                user.id
              )
              .order(
                'created_at',
                {
                  ascending:
                    true,
                }
              ),

            supabase
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
                  completed
                `
              )
              .eq(
                'user_id',
                user.id
              )
              .eq(
                'completed',
                false
              )
              .order(
                'created_at',
                {
                  ascending:
                    false,
                }
              ),

            supabase
              .from(
                'focus_sessions'
              )
              .select(
                `
                  id,
                  subject_id,
                  task_id,
                  subject,
                  topic,
                  duration_minutes,
                  completed_at
                `
              )
              .eq(
                'user_id',
                user.id
              )
              .order(
                'completed_at',
                {
                  ascending:
                    false,
                }
              ),
          ])

        if (
          subjectsResult.error
        ) {
          throw subjectsResult.error
        }

        if (
          tasksResult.error
        ) {
          throw tasksResult.error
        }

        if (
          sessionsResult.error
        ) {
          throw sessionsResult.error
        }

        const loadedSubjects =
          (
            subjectsResult.data ??
            []
          ).map(
            subject => ({
              id:
                subject.id,

              name:
                subject.name,
            })
          )

        const loadedTasks =
          (
            tasksResult.data ??
            []
          ).map(
            row =>
              mapTaskRowToTask(
                row as TaskRow
              )
          )

        const taskTitleMap =
          new Map<
            string,
            string
          >()

        loadedTasks.forEach(
          task => {
            taskTitleMap.set(
              task.id,
              task.title
            )
          }
        )

        const loadedSessions =
          (
            sessionsResult.data ??
            []
          ).map(
            row => {
              const session =
                row as FocusSessionRow

              return {
                id:
                  session.id,

                subjectId:
                  session.subject_id ??
                  undefined,

                subject:
                  session.subject ||
                  'Personal',

                taskId:
                  session.task_id ??
                  undefined,

                taskTitle:
                  session.task_id
                    ? taskTitleMap.get(
                        session.task_id
                      )
                    : undefined,

                topic:
                  session.topic ||
                  'General study',

                durationMinutes:
                  Number(
                    session.duration_minutes ??
                      0
                  ),

                completedAt:
                  session.completed_at,
              } as FocusSession
            }
          )

        setSubjects(
          loadedSubjects
        )

        setTasks(
          loadedTasks
        )

        setFocusSessions(
          loadedSessions
        )

        if (
          loadedSubjects.length >
            0
        ) {
          setSelectedSubject(
            current => {
              const stillExists =
                loadedSubjects.some(
                  subject =>
                    subject.name ===
                    current
                )

              return stillExists
                ? current
                : loadedSubjects[0]
                    .name
            }
          )
        } else {
          setSelectedSubject(
            'Personal'
          )
        }
      } catch (loadError) {
        console.error(
          'Failed to load Focus data:',
          loadError
        )

        setError(
          loadError instanceof
            Error
            ? loadError.message
            : 'Focus data could not be loaded.'
        )
      } finally {
        setDataLoading(
          false
        )
      }
    }

  useEffect(() => {
    void loadFocusData()
  }, [])

  const subjectNames =
    useMemo(
      () => {
        const names =
          subjects.map(
            subject =>
              subject.name
          )

        const taskSubjects =
          tasks
            .map(
              task =>
                task.subject
                  ?.trim()
            )
            .filter(
              (
                subject
              ): subject is string =>
                Boolean(
                  subject
                )
            )

        const combined =
          Array.from(
            new Set([
              ...names,
              ...taskSubjects,
            ])
          )

        if (
          combined.length ===
          0
        ) {
          return [
            'Personal',
          ]
        }

        return combined
      },
      [
        subjects,
        tasks,
      ]
    )

  const tasksForSubject =
    useMemo(
      () =>
        tasks.filter(
          task =>
            !task.completed &&
            (
              task.subject ||
              'Personal'
            ).toLowerCase() ===
              selectedSubject.toLowerCase()
        ),
      [
        tasks,
        selectedSubject,
      ]
    )

  const selectedTask =
    tasks.find(
      task =>
        task.id ===
        selectedTaskId
    )

  const normalizedDuration =
    normalizeDuration(
      durationHours,
      durationMinutes
    )

  const totalDurationSeconds =
    durationToSeconds(
      normalizedDuration.hours,
      normalizedDuration.minutes
    )

  const totalDurationMinutes =
    durationToMinutes(
      normalizedDuration.hours,
      normalizedDuration.minutes
    )

  const selectedSubjectRecord =
    subjects.find(
      subject =>
        subject.name
          .trim()
          .toLowerCase() ===
        selectedSubject
          .trim()
          .toLowerCase()
    )

  const playAlarm =
    () => {
      if (
        !soundEnabled
      ) {
        return
      }

      try {
        const AudioContextClass =
          window.AudioContext ||
          (
            window as typeof window & {
              webkitAudioContext?: typeof AudioContext
            }
          ).webkitAudioContext

        if (
          !AudioContextClass
        ) {
          return
        }

        const context =
          new AudioContextClass()

        const playTone = (
          delay: number,
          frequency: number
        ) => {
          const oscillator =
            context.createOscillator()

          const gain =
            context.createGain()

          oscillator.type =
            'sine'

          oscillator.frequency.value =
            frequency

          gain.gain.setValueAtTime(
            0.0001,
            context.currentTime +
              delay
          )

          gain.gain.exponentialRampToValueAtTime(
            0.25,
            context.currentTime +
              delay +
              0.02
          )

          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            context.currentTime +
              delay +
              0.35
          )

          oscillator.connect(
            gain
          )

          gain.connect(
            context.destination
          )

          oscillator.start(
            context.currentTime +
              delay
          )

          oscillator.stop(
            context.currentTime +
              delay +
              0.4
          )
        }

        playTone(
          0,
          660
        )

        playTone(
          0.45,
          784
        )

        playTone(
          0.9,
          988
        )

        window.setTimeout(
          () => {
            void context.close()
          },
          1800
        )
      } catch (
        soundError
      ) {
        console.error(
          'Unable to play focus alarm:',
          soundError
        )
      }
    }

  const saveCompletedSession =
    async () => {
      if (
        completionSavedRef.current
      ) {
        return
      }

      if (
        totalDurationMinutes <=
        0
      ) {
        return
      }

      completionSavedRef.current =
        true

      setSavingSession(
        true
      )

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

        const topic =
          selectedTask?.title ||
          customTopic.trim() ||
          'General study'

        const {
          data,
          error:
            insertError,
        } =
          await supabase
            .from(
              'focus_sessions'
            )
            .insert({
              user_id:
                user.id,

              subject_id:
                selectedSubjectRecord?.id ??
                null,

              task_id:
                selectedTask?.id ??
                null,

              subject:
                selectedSubject ||
                'Personal',

              topic,

              duration_minutes:
                totalDurationMinutes,

              completed_at:
                new Date().toISOString(),
            })
            .select(
              `
                id,
                subject_id,
                task_id,
                subject,
                topic,
                duration_minutes,
                completed_at
              `
            )
            .single()

        if (
          insertError
        ) {
          throw insertError
        }

        const savedRow =
          data as FocusSessionRow

        const savedSession:
          FocusSession = {
          id:
            savedRow.id,

          subjectId:
            savedRow.subject_id ??
            undefined,

          subject:
            savedRow.subject,

          taskId:
            savedRow.task_id ??
            undefined,

          taskTitle:
            selectedTask?.title,

          topic:
            savedRow.topic,

          durationMinutes:
            Number(
              savedRow.duration_minutes
            ),

          completedAt:
            savedRow.completed_at,
        }

        setFocusSessions(
          current => [
            savedSession,
            ...current,
          ]
        )
      } catch (
        saveError
      ) {
        console.error(
          'Failed to save completed focus session:',
          saveError
        )

        completionSavedRef.current =
          false

        setError(
          saveError instanceof
            Error
            ? `Your timer completed, but the session could not be saved: ${saveError.message}`
            : 'Your timer completed, but the session could not be saved.'
        )
      } finally {
        setSavingSession(
          false
        )
      }
    }

  const finishSession =
    () => {
      if (
        intervalRef.current
      ) {
        clearInterval(
          intervalRef.current
        )

        intervalRef.current =
          null
      }

      endTimeRef.current =
        null

      setRunning(
        false
      )

      setTimeLeft(
        0
      )

      setCompleted(
        true
      )

      playAlarm()

      void saveCompletedSession()
    }

  useEffect(
    () => {
      if (!running) {
        if (
          intervalRef.current
        ) {
          clearInterval(
            intervalRef.current
          )

          intervalRef.current =
            null
        }

        return
      }

      if (
        endTimeRef.current ===
        null
      ) {
        endTimeRef.current =
          Date.now() +
          timeLeft *
            1000
      }

      const updateTimer =
        () => {
          if (
            endTimeRef.current ===
            null
          ) {
            return
          }

          const remaining =
            Math.max(
              0,
              Math.ceil(
                (
                  endTimeRef.current -
                  Date.now()
                ) /
                  1000
              )
            )

          setTimeLeft(
            remaining
          )

          if (
            remaining <=
            0
          ) {
            finishSession()
          }
        }

      updateTimer()

      intervalRef.current =
        setInterval(
          updateTimer,
          250
        )

      return () => {
        if (
          intervalRef.current
        ) {
          clearInterval(
            intervalRef.current
          )

          intervalRef.current =
            null
        }
      }
    },
    [running]
  )

  const applyDuration =
    (
      hours: number,
      minutes: number
    ) => {
      const normalized =
        normalizeDuration(
          hours,
          minutes
        )

      setDurationHours(
        normalized.hours
      )

      setDurationMinutes(
        normalized.minutes
      )

      const seconds =
        durationToSeconds(
          normalized.hours,
          normalized.minutes
        )

      setTimeLeft(
        seconds
      )

      setRunning(
        false
      )

      setCompleted(
        false
      )

      setError('')

      endTimeRef.current =
        null

      completionSavedRef.current =
        false
    }

  const handleHoursChange =
    (
      value: string
    ) => {
      const hours =
        value === ''
          ? 0
          : Number(
              value
            )

      applyDuration(
        Number.isNaN(
          hours
        )
          ? 0
          : Math.max(
              0,
              hours
            ),
        durationMinutes
      )
    }

  const handleMinutesChange =
    (
      value: string
    ) => {
      const minutes =
        value === ''
          ? 0
          : Number(
              value
            )

      applyDuration(
        durationHours,
        Number.isNaN(
          minutes
        )
          ? 0
          : Math.max(
              0,
              minutes
            )
      )
    }

  const handleStartPause =
    () => {
      if (completed) {
        return
      }

      if (
        totalDurationSeconds <=
        0
      ) {
        setError(
          'Set a focus duration greater than 0 minutes.'
        )

        return
      }

      if (
        running
      ) {
        if (
          endTimeRef.current
        ) {
          const remaining =
            Math.max(
              0,
              Math.ceil(
                (
                  endTimeRef.current -
                  Date.now()
                ) /
                  1000
              )
            )

          setTimeLeft(
            remaining
          )
        }

        endTimeRef.current =
          null

        setRunning(
          false
        )

        return
      }

      setError('')

      endTimeRef.current =
        Date.now() +
        timeLeft *
          1000

      setRunning(
        true
      )
    }

  const handleReset =
    () => {
      if (
        intervalRef.current
      ) {
        clearInterval(
          intervalRef.current
        )

        intervalRef.current =
          null
      }

      endTimeRef.current =
        null

      setRunning(
        false
      )

      setCompleted(
        false
      )

      setTimeLeft(
        totalDurationSeconds
      )

      completionSavedRef.current =
        false

      setError('')
    }

  const handleSubjectChange =
    (
      subject: string
    ) => {
      if (running) {
        return
      }

      setSelectedSubject(
        subject
      )

      setSelectedTaskId(
        ''
      )

      setCustomTopic(
        ''
      )
    }

  const handleTaskChange =
    (
      taskId: string
    ) => {
      if (running) {
        return
      }

      setSelectedTaskId(
        taskId
      )

      if (taskId) {
        setCustomTopic(
          ''
        )
      }
    }

  const clearHistory =
    async () => {
      if (
        clearingHistory ||
        focusSessions.length ===
          0
      ) {
        return
      }

      const confirmed =
        window.confirm(
          'Clear all completed focus-session history? This cannot be undone.'
        )

      if (!confirmed) {
        return
      }

      setClearingHistory(
        true
      )

      setError('')

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
          error:
            deleteError,
        } =
          await supabase
            .from(
              'focus_sessions'
            )
            .delete()
            .eq(
              'user_id',
              user.id
            )

        if (
          deleteError
        ) {
          throw deleteError
        }

        setFocusSessions(
          []
        )
      } catch (
        clearError
      ) {
        console.error(
          'Failed to clear focus history:',
          clearError
        )

        setError(
          clearError instanceof
            Error
            ? clearError.message
            : 'Focus history could not be cleared.'
        )
      } finally {
        setClearingHistory(
          false
        )
      }
    }

  const weeklySessions =
    focusSessions.filter(
      session =>
        isThisWeek(
          session.completedAt
        )
    )

  const weeklyMinutes =
    weeklySessions.reduce(
      (
        total,
        session
      ) =>
        total +
        session.durationMinutes,
      0
    )

  const streak =
    getFocusStreak(
      focusSessions
    )

  const circumference =
    2 *
    Math.PI *
    72

  const progress =
    totalDurationSeconds >
    0
      ? 1 -
        timeLeft /
          totalDurationSeconds
      : 0

  const safeProgress =
    Math.min(
      1,
      Math.max(
        0,
        progress
      )
    )

  const offset =
    circumference *
    (
      1 -
      safeProgress
    )

  const sessionLabel =
    selectedTask
      ?.title ||
    customTopic.trim() ||
    'General study'

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">

      <div className="mb-8">

        <h1 className="font-display font-800 text-2xl text-slate-900 dark:text-white">
          Focus
        </h1>

        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
          Deep work sessions using your real subjects and tasks.
        </p>

      </div>

      {dataLoading && (
        <div className="mb-6 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-xl px-4 py-3">

          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            Loading your Focus data...
          </p>

        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 lg:p-8 flex flex-col items-center">

          <div className="w-full mb-5">

            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Subject / Category
            </label>

            {subjectNames.length >
            0 ? (
              <div className="flex flex-wrap gap-2">

                {subjectNames.map(
                  (
                    subject,
                    index
                  ) => {
                    const color =
                      SUBJECT_COLORS[
                        index %
                          SUBJECT_COLORS.length
                      ]

                    return (
                      <button
                        type="button"
                        key={
                          subject
                        }
                        disabled={
                          running ||
                          dataLoading
                        }
                        onClick={() =>
                          handleSubjectChange(
                            subject
                          )
                        }
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-50 ${
                          selectedSubject ===
                          subject
                            ? `${color.text} border-current bg-slate-50 dark:bg-slate-800`
                            : 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                        }`}
                      >

                        <div
                          className={`w-1.5 h-1.5 rounded-full ${color.dot}`}
                        />

                        {subject}

                      </button>
                    )
                  }
                )}

              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No subjects have been added yet. Focus will use Personal for now.
                </p>

              </div>
            )}

          </div>

          <div className="w-full mb-4">

            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Task
              <span className="font-normal text-slate-400">
                {' '}
                (optional)
              </span>
            </label>

            <select
              value={
                selectedTaskId
              }
              disabled={
                running ||
                dataLoading
              }
              onChange={event =>
                handleTaskChange(
                  event.target.value
                )
              }
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white disabled:opacity-50"
            >
              <option value="">
                General study / custom topic
              </option>

              {tasksForSubject.map(
                task => (
                  <option
                    key={
                      task.id
                    }
                    value={
                      task.id
                    }
                  >
                    {task.title}
                  </option>
                )
              )}

            </select>

          </div>

          {!selectedTaskId && (
            <div className="w-full mb-5">

              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                What are you focusing on?
              </label>

              <input
                type="text"
                value={
                  customTopic
                }
                disabled={
                  running ||
                  dataLoading
                }
                onChange={event =>
                  setCustomTopic(
                    event.target.value
                  )
                }
                placeholder="e.g. Revise chapter 4"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

            </div>
          )}

          <div className="relative flex items-center justify-center my-6">

            <svg
              width="190"
              height="190"
              className="rotate-[-90deg]"
            >

              <circle
                cx="95"
                cy="95"
                r="72"
                fill="none"
                stroke="currentColor"
                strokeWidth="7"
                className="text-slate-100 dark:text-slate-800"
              />

              <circle
                cx="95"
                cy="95"
                r="72"
                fill="none"
                stroke={
                  completed
                    ? '#22c55e'
                    : '#6366f1'
                }
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={
                  circumference
                }
                strokeDashoffset={
                  offset
                }
                style={{
                  transition:
                    'stroke-dashoffset 0.25s linear',
                }}
              />

            </svg>

            <div className="absolute text-center">

              {completed ? (
                <div className="flex flex-col items-center">

                  <div className="w-11 h-11 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mb-1">

                    <Check
                      size={24}
                      className="text-green-600 dark:text-green-400"
                      strokeWidth={
                        2.5
                      }
                    />

                  </div>

                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                    Session complete!
                  </span>

                </div>
              ) : (
                <>

                  <span className="font-mono font-700 text-3xl lg:text-4xl text-slate-900 dark:text-white">
                    {secondsToClock(
                      timeLeft
                    )}
                  </span>

                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">

                    {running
                      ? 'Focus time'
                      : timeLeft <
                        totalDurationSeconds
                      ? 'Paused'
                      : 'Ready'}

                  </p>

                </>
              )}

            </div>

          </div>

          <div className="w-full mb-5">

            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Focus duration
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
                    disabled={
                      running ||
                      dataLoading
                    }
                    onChange={event =>
                      handleHoursChange(
                        event.target.value
                      )
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pr-12 text-sm text-slate-900 dark:text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    disabled={
                      running ||
                      dataLoading
                    }
                    onChange={event =>
                      handleMinutesChange(
                        event.target.value
                      )
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pr-12 text-sm text-slate-900 dark:text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

              {totalDurationMinutes >
              0
                ? `Session length: ${formatMinutes(
                    totalDurationMinutes
                  )}`
                : 'Choose a duration greater than 0 minutes.'}

            </div>

          </div>

          <div className="w-full mb-6">

            <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">

              <div className="flex items-center gap-2">

                {soundEnabled ? (
                  <Volume2
                    size={16}
                    className="text-indigo-500"
                  />
                ) : (
                  <VolumeX
                    size={16}
                    className="text-slate-400"
                  />
                )}

                <div>

                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Completion sound
                  </p>

                  <p className="text-xs text-slate-400">
                    Play an alarm when focus time ends.
                  </p>

                </div>

              </div>

              <div className="flex items-center gap-2">

                <button
                  type="button"
                  onClick={
                    playAlarm
                  }
                  disabled={
                    !soundEnabled
                  }
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 disabled:opacity-40"
                >
                  Test
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSoundEnabled(
                      value =>
                        !value
                    )
                  }
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    soundEnabled
                      ? 'bg-indigo-600'
                      : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-label="Toggle completion sound"
                >

                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${
                      soundEnabled
                        ? 'left-5'
                        : 'left-1'
                    }`}
                  />

                </button>

              </div>

            </div>

          </div>

          {error && (
            <div className="w-full mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2.5">

              <p className="text-xs text-red-600 dark:text-red-400">
                {error}
              </p>

            </div>
          )}

          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={
                handleReset
              }
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              title="Reset session"
            >
              <RotateCcw
                size={17}
              />
            </button>

            <button
              type="button"
              onClick={
                handleStartPause
              }
              disabled={
                completed ||
                dataLoading ||
                savingSession ||
                totalDurationSeconds <=
                  0
              }
              className="flex items-center justify-center gap-2 min-w-36 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            >

              {running ? (
                <Pause
                  size={18}
                />
              ) : (
                <Play
                  size={18}
                />
              )}

              {running
                ? 'Pause'
                : timeLeft <
                  totalDurationSeconds
                ? 'Resume'
                : 'Start Focus'}

            </button>

          </div>

          {savingSession && (
            <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-3">
              Saving completed session...
            </p>
          )}

        </div>

        <div className="space-y-5">

          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 border border-indigo-200 dark:border-indigo-900 rounded-2xl p-5">

            <div className="flex items-center gap-2 mb-3">

              <Zap
                size={14}
                className="text-indigo-600 dark:text-indigo-400"
              />

              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                Current Session
              </span>

            </div>

            <h3 className="font-display font-600 text-slate-900 dark:text-white mb-1">
              {selectedSubject}
            </h3>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              {sessionLabel}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">

              <span className="flex items-center gap-1.5">

                <Clock
                  size={11}
                />

                {formatMinutes(
                  totalDurationMinutes
                )}

              </span>

              {selectedTask && (
                <span className="flex items-center gap-1.5">

                  <CheckSquare
                    size={11}
                  />

                  Task

                </span>
              )}

              <span>

                {running
                  ? 'In progress'
                  : completed
                  ? 'Completed'
                  : 'Ready'}

              </span>

            </div>

          </div>

          <div className="grid grid-cols-3 gap-3">

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center">

              <Target
                size={16}
                className="mx-auto text-indigo-500 mb-1"
              />

              <div className="font-display font-700 text-lg text-indigo-600 dark:text-indigo-400">
                {
                  weeklySessions.length
                }
              </div>

              <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Sessions
              </div>

              <div className="text-xs text-slate-400 dark:text-slate-500">
                this week
              </div>

            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center">

              <Clock
                size={16}
                className="mx-auto text-violet-500 mb-1"
              />

              <div className="font-display font-700 text-lg text-indigo-600 dark:text-indigo-400">
                {formatMinutes(
                  weeklyMinutes
                )}
              </div>

              <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Focus time
              </div>

              <div className="text-xs text-slate-400 dark:text-slate-500">
                this week
              </div>

            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center">

              <Flame
                size={16}
                className="mx-auto text-amber-500 mb-1"
              />

              <div className="font-display font-700 text-lg text-indigo-600 dark:text-indigo-400">
                {streak}
              </div>

              <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Day streak
              </div>

              <div className="text-xs text-slate-400 dark:text-slate-500">
                {streak > 0
                  ? 'keep going!'
                  : 'start today'}
              </div>

            </div>

          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">

            <div className="flex items-center justify-between gap-3 mb-4">

              <div className="flex items-center gap-2">

                <BookOpen
                  size={14}
                  className="text-slate-400"
                />

                <h3 className="font-display font-600 text-sm text-slate-900 dark:text-white">
                  Recent Sessions
                </h3>

              </div>

              {focusSessions.length >
                0 && (
                <button
                  type="button"
                  onClick={() =>
                    void clearHistory()
                  }
                  disabled={
                    clearingHistory
                  }
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                >

                  <Trash2
                    size={11}
                  />

                  {clearingHistory
                    ? 'Clearing...'
                    : 'Clear'}

                </button>
              )}

            </div>

            {focusSessions.length >
            0 ? (
              <div className="space-y-3">

                {focusSessions
                  .slice(
                    0,
                    6
                  )
                  .map(
                    (
                      session,
                      index
                    ) => {
                      const color =
                        SUBJECT_COLORS[
                          index %
                            SUBJECT_COLORS.length
                        ]

                      return (
                        <div
                          key={
                            session.id
                          }
                          className="flex items-center gap-3"
                        >

                          <div
                            className={`w-2.5 h-2.5 rounded-full ${color.dot} flex-shrink-0`}
                          />

                          <div className="flex-1 min-w-0">

                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                              {
                                session.subject
                              }
                            </p>

                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                              {
                                session.topic
                              }
                            </p>

                          </div>

                          <div className="text-right flex-shrink-0">

                            <p className="font-mono text-xs font-medium text-slate-600 dark:text-slate-400">
                              {formatMinutes(
                                session.durationMinutes
                              )}
                            </p>

                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              {formatSessionTime(
                                session.completedAt
                              )}
                            </p>

                          </div>

                        </div>
                      )
                    }
                  )}

              </div>
            ) : (
              <div className="py-8 text-center">

                <CalendarDays
                  size={28}
                  className="mx-auto text-slate-300 dark:text-slate-600 mb-2"
                />

                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No completed focus sessions yet
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  Finish your first session and it will appear here.
                </p>

              </div>
            )}

          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl p-4">

            <div className="flex items-start gap-3">

              <Bell
                size={16}
                className="text-amber-600 dark:text-amber-400 mt-0.5"
              />

              <div>

                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Focus alarm enabled
                </p>

                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                  Keep this browser tab open while focusing. When the timer reaches zero, My Scheduler will play a short completion chime if sound is enabled.
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}