import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Zap,
  Lock,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CheckCircle2,
  BookOpen,
  Sparkles,
  MapPin,
  UserRound,
  Clock,
  X,
  CheckSquare,
  AlertCircle,
} from 'lucide-react'

import type {
  UserProfile,
  Task,
  StudyPreference,
} from '../types'

import AddTaskModal from '../components/AddTaskModal'
import { supabase } from '../utils/supabase'

interface MyDayProps {
  userProfile: UserProfile | null
}

interface StudyPlanSession {
  id: string
  day: string
  scheduledDate: string
  subject: string
  startTime: string
  endTime: string
  durationMinutes: number
  reason: string
  assessmentId?: string
}

interface StudyPlanRow {
  id: string
  subject_id: string | null
  title: string
  scheduled_date: string
  start_time: string | null
  end_time: string | null
  duration_minutes: number | null
  notes: string | null
}

interface SubjectRow {
  id: string
  name: string
}

type TaskSchedulingType =
  | 'fixed'
  | 'flexible'

interface ScheduledTask extends Task {
  schedulingType: TaskSchedulingType
  scheduledDate: string
  scheduledTime: string
  durationMinutes: number
}

interface DayEvent {
  id: string
  title: string
  subtitle: string
  startTime: string
  endTime: string

  type:
    | 'class'
    | 'routine'
    | 'study'
    | 'task'
    | 'fixed-task'
    | 'planned-routine'

  color: string
  fixed: boolean

  venue?: string
  lecturer?: string

  taskId?: string
}

interface TimeBlock {
  start: number
  end: number
}

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const HOURS = Array.from(
  { length: 20 },
  (_, index) => index + 4
)

const START_HOUR = 4
const HOUR_HEIGHT = 64

const CLASS_COLORS = [
  'bg-indigo-500 border-indigo-400',
  'bg-violet-500 border-violet-400',
  'bg-blue-500 border-blue-400',
  'bg-cyan-500 border-cyan-400',
]

const PRIORITY_STYLES = {
  high: {
    label: 'High',
    className:
      'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400',
  },

  medium: {
    label: 'Medium',
    className:
      'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400',
  },

  low: {
    label: 'Low',
    className:
      'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
  },
}

function formatHour(hour: number) {
  if (
    hour === 0 ||
    hour === 24
  ) {
    return '12 AM'
  }

  if (hour === 12) {
    return '12 PM'
  }

  return hour < 12
    ? `${hour} AM`
    : `${hour - 12} PM`
}

function formatTime(time: string) {
  if (!time) return ''

  const [
    hourString,
    minute,
  ] = time.split(':')

  const hour =
    Number(hourString)

  const suffix =
    hour >= 12
      ? 'PM'
      : 'AM'

  const displayHour =
    hour % 12 || 12

  return `${displayHour}:${minute} ${suffix}`
}

function timeToMinutes(
  time: string
) {
  const [
    hour,
    minute,
  ] =
    time
      .split(':')
      .map(Number)

  return (
    hour * 60 +
    minute
  )
}

function minutesToTime(
  minutes: number
) {
  const normalized =
    ((minutes % 1440) +
      1440) %
    1440

  const hour =
    Math.floor(
      normalized / 60
    )

  const minute =
    normalized % 60

  return `${String(
    hour
  ).padStart(
    2,
    '0'
  )}:${String(
    minute
  ).padStart(
    2,
    '0'
  )}`
}

function durationToMinutes(
  duration: string
) {
  const normalized =
    duration.toLowerCase()

  const hourMatch =
    normalized.match(
      /([\d.]+)\s*hour/
    )

  const minuteMatch =
    normalized.match(
      /(\d+)\s*min/
    )

  let total = 0

  if (hourMatch) {
    total +=
      Number(
        hourMatch[1]
      ) * 60
  }

  if (minuteMatch) {
    total +=
      Number(
        minuteMatch[1]
      )
  }

  if (total === 0) {
    const numeric =
      Number.parseFloat(
        normalized
      )

    if (
      !Number.isNaN(
        numeric
      )
    ) {
      total =
        numeric
    }
  }

  return Math.max(
    Math.round(
      total
    ),
    15
  )
}

function formatDate(
  date: Date
) {
  return new Intl.DateTimeFormat(
    'en-US',
    {
      weekday:
        'long',
      month:
        'long',
      day:
        'numeric',
    }
  ).format(
    date
  )
}

function formatTaskDueDate(
  date: string
) {
  if (!date) {
    return 'No due date'
  }

  return new Intl.DateTimeFormat(
    'en-US',
    {
      weekday:
        'long',
      month:
        'long',
      day:
        'numeric',
      year:
        'numeric',
    }
  ).format(
    new Date(
      `${date}T00:00:00`
    )
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

function getDayName(
  dateString: string
) {
  const date =
    new Date(
      `${dateString}T00:00:00`
    )

  return new Intl.DateTimeFormat(
    'en-US',
    {
      weekday:
        'long',
    }
  ).format(
    date
  )
}

function calculateDaysUntilDue(
  date: string
) {
  if (!date) {
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
      `${date}T00:00:00`
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
      (
        1000 *
        60 *
        60 *
        24
      )
  )
}

function buildTaskDuration(
  totalMinutes: number
) {
  const safeMinutes =
    Math.max(
      0,
      totalMinutes
    )

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

  if (minutes > 0) {
    return `${minutes} min`
  }

  return '0 min'
}

function mirrorStudyPlanLocally(
  plan: StudyPlanSession[]
) {
  localStorage.setItem(
    'mySchedulerStudyPlan',
    JSON.stringify(
      plan.map(
        session => ({
          id:
            session.id,

          day:
            session.day,

          subject:
            session.subject,

          startTime:
            session.startTime,

          endTime:
            session.endTime,

          durationMinutes:
            session.durationMinutes,

          reason:
            session.reason,

          assessmentId:
            session.assessmentId,
        })
      )
    )
  )
}

function mergeBlocks(
  blocks: TimeBlock[]
) {
  if (
    blocks.length ===
    0
  ) {
    return []
  }

  const sorted =
    [...blocks].sort(
      (
        a,
        b
      ) =>
        a.start -
        b.start
    )

  const merged:
    TimeBlock[] = [
      {
        ...sorted[0],
      },
    ]

  for (
    let index = 1;
    index <
    sorted.length;
    index++
  ) {
    const current =
      sorted[index]

    const previous =
      merged[
        merged.length -
          1
      ]

    if (
      current.start <=
      previous.end
    ) {
      previous.end =
        Math.max(
          previous.end,
          current.end
        )
    } else {
      merged.push({
        ...current,
      })
    }
  }

  return merged
}

function getFreeBlocks(
  start: number,
  end: number,
  busyBlocks: TimeBlock[]
) {
  const free:
    TimeBlock[] = []

  const merged =
    mergeBlocks(
      busyBlocks.filter(
        block =>
          block.end >
            start &&
          block.start <
            end
      )
    )

  let cursor =
    start

  merged.forEach(
    block => {
      const blockStart =
        Math.max(
          block.start,
          start
        )

      const blockEnd =
        Math.min(
          block.end,
          end
        )

      if (
        blockStart >
        cursor
      ) {
        free.push({
          start:
            cursor,
          end:
            blockStart,
        })
      }

      cursor =
        Math.max(
          cursor,
          blockEnd
        )
    }
  )

  if (
    cursor < end
  ) {
    free.push({
      start:
        cursor,
      end,
    })
  }

  return free
}

function getStudyWindows(
  preferences:
    StudyPreference[]
) {
  return preferences.map(
    preference => ({
      start:
        timeToMinutes(
          preference.startTime
        ),

      end:
        timeToMinutes(
          preference.endTime
        ),
    })
  )
}

function isAcademicTask(
  task: Task,
  subjects: string[]
) {
  return subjects.some(
    subject =>
      subject.toLowerCase() ===
      task.subject.toLowerCase()
  )
}

function findSlot(
  duration: number,
  freeBlocks: TimeBlock[],
  preferredBlocks?:
    TimeBlock[]
) {
  if (
    preferredBlocks &&
    preferredBlocks.length >
      0
  ) {
    for (
      const free of
        freeBlocks
    ) {
      for (
        const preferred of
          preferredBlocks
      ) {
        const start =
          Math.max(
            free.start,
            preferred.start
          )

        const end =
          Math.min(
            free.end,
            preferred.end
          )

        if (
          end -
            start >=
          duration
        ) {
          return {
            start,
            end:
              start +
              duration,
          }
        }
      }
    }
  }

  for (
    const free of
      freeBlocks
  ) {
    if (
      free.end -
        free.start >=
      duration
    ) {
      return {
        start:
          free.start,

        end:
          free.start +
          duration,
      }
    }
  }

  return null
}

export default function MyDay({
  userProfile,
}: MyDayProps) {
  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState(
      new Date()
    )

  const [
    plannedEvents,
    setPlannedEvents,
  ] =
    useState<
      DayEvent[]
    >([])

  const [
    autoPlanDone,
    setAutoPlanDone,
  ] =
    useState(
      false
    )

  const [
    showAddTask,
    setShowAddTask,
  ] =
    useState(
      false
    )

  const [
    taskRefreshKey,
    setTaskRefreshKey,
  ] =
    useState(0)

  const [
    allTasks,
    setAllTasks,
  ] =
    useState<
      ScheduledTask[]
    >([])

  const [
    studyPlan,
    setStudyPlan,
  ] =
    useState<
      StudyPlanSession[]
    >([])

  const [
    studyPlanLoading,
    setStudyPlanLoading,
  ] =
    useState(
      true
    )

  /*
   * LOAD TASKS FROM SUPABASE
   *
   * Supabase is now also the source of truth
   * for fixed/flexible task scheduling.
   */
  useEffect(
    () => {
      let cancelled =
        false

      async function loadTasksFromSupabase() {
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
            if (
              !cancelled
            ) {
              setAllTasks(
                []
              )
            }

            return
          }

          const {
            data,
            error:
              tasksError,
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
                  scheduling_type,
                  scheduled_date,
                  scheduled_time
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

          if (
            tasksError
          ) {
            throw tasksError
          }

          const loadedTasks:
            ScheduledTask[] =
            (
              data ??
              []
            ).map(
              task => {
                const dueDate =
                  task.due_date
                    ? task.due_date.slice(
                        0,
                        10
                      )
                    : ''

                const durationMinutes =
                  Math.max(
                    0,
                    Number(
                      task.duration_minutes ??
                        0
                    )
                  )

                const priority:
                  Task['priority'] =
                  task.priority ===
                    'high' ||
                  task.priority ===
                    'low'
                    ? task.priority
                    : 'medium'

                const schedulingType:
                  TaskSchedulingType =
                  task.scheduling_type ===
                  'fixed'
                    ? 'fixed'
                    : 'flexible'

                return {
                  id:
                    task.id,

                  title:
                    task.title,

                  subject:
                    task.subject ??
                    'Personal',

                  dueDate,

                  daysUntilDue:
                    calculateDaysUntilDue(
                      dueDate
                    ),

                  duration:
                    buildTaskDuration(
                      durationMinutes
                    ),

                  priority,

                  completed:
                    Boolean(
                      task.completed
                    ),

                  schedulingType,

                  scheduledDate:
                    task.scheduled_date
                      ? task.scheduled_date.slice(
                          0,
                          10
                        )
                      : '',

                  scheduledTime:
                    task.scheduled_time
                      ? task.scheduled_time.slice(
                          0,
                          5
                        )
                      : '',

                  durationMinutes,
                }
              }
            )

          if (
            !cancelled
          ) {
            setAllTasks(
              loadedTasks
            )
          }
        } catch (
          error
        ) {
          console.error(
            'Failed to load My Day tasks from Supabase:',
            error
          )

          if (
            !cancelled
          ) {
            setAllTasks(
              []
            )
          }
        }
      }

      loadTasksFromSupabase()

      return () => {
        cancelled =
          true
      }
    },
    [
      taskRefreshKey,
    ]
  )

  /*
   * LOAD STUDY PLAN FROM SUPABASE
   */
  useEffect(
    () => {
      let cancelled =
        false

      async function loadStudyPlanFromSupabase() {
        setStudyPlanLoading(
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
            if (
              !cancelled
            ) {
              setStudyPlan(
                []
              )
            }

            return
          }

          const [
            subjectResult,
            planResult,
          ] =
            await Promise.all(
              [
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
                  ),

                supabase
                  .from(
                    'study_plans'
                  )
                  .select(
                    `
                      id,
                      subject_id,
                      title,
                      scheduled_date,
                      start_time,
                      end_time,
                      duration_minutes,
                      notes
                    `
                  )
                  .eq(
                    'user_id',
                    user.id
                  )
                  .order(
                    'scheduled_date',
                    {
                      ascending:
                        true,
                    }
                  )
                  .order(
                    'start_time',
                    {
                      ascending:
                        true,
                    }
                  ),
              ]
            )

          if (
            subjectResult.error
          ) {
            throw subjectResult.error
          }

          if (
            planResult.error
          ) {
            throw planResult.error
          }

          const subjectMap =
            new Map<
              string,
              string
            >()

          ;(
            subjectResult.data ??
            []
          ).forEach(
            row => {
              const subject =
                row as SubjectRow

              subjectMap.set(
                subject.id,
                subject.name
              )
            }
          )

          const loadedStudyPlan:
            StudyPlanSession[] =
            (
              planResult.data ??
              []
            ).map(
              row => {
                const session =
                  row as StudyPlanRow

                const subject =
                  session.subject_id
                    ? subjectMap.get(
                        session.subject_id
                      ) ||
                      session.title.replace(
                        /^Study\s+/i,
                        ''
                      )
                    : session.title.replace(
                        /^Study\s+/i,
                        ''
                      )

                return {
                  id:
                    session.id,

                  day:
                    getDayName(
                      session.scheduled_date
                    ),

                  scheduledDate:
                    session.scheduled_date,

                  subject,

                  startTime:
                    session.start_time?.slice(
                      0,
                      5
                    ) ??
                    '',

                  endTime:
                    session.end_time?.slice(
                      0,
                      5
                    ) ??
                    '',

                  durationMinutes:
                    Number(
                      session.duration_minutes ??
                        0
                    ),

                  reason:
                    session.notes ||
                    'Study session',
                }
              }
            )

          if (
            !cancelled
          ) {
            setStudyPlan(
              loadedStudyPlan
            )

            mirrorStudyPlanLocally(
              loadedStudyPlan
            )
          }
        } catch (
          error
        ) {
          console.error(
            'Failed to load My Day study plan from Supabase:',
            error
          )

          if (
            !cancelled
          ) {
            setStudyPlan(
              []
            )
          }
        } finally {
          if (
            !cancelled
          ) {
            setStudyPlanLoading(
              false
            )
          }
        }
      }

      loadStudyPlanFromSupabase()

      return () => {
        cancelled =
          true
      }
    },
    []
  )

  const [
    selectedClass,
    setSelectedClass,
  ] =
    useState<
      DayEvent | null
    >(null)

  const [
    selectedTask,
    setSelectedTask,
  ] =
    useState<
      Task | null
    >(null)

  const classes =
    userProfile
      ?.classes ??
    []

  const routines =
    userProfile
      ?.routines ??
    []

  const subjects =
    userProfile
      ?.subjects ??
    []

  const studyPreferences =
    userProfile
      ?.studyPreferences ??
    []

  const selectedDayName =
    DAYS[
      selectedDate.getDay()
    ]

  const selectedDateKey =
    getDateKey(
      selectedDate
    )

  /*
   * CLASSES + FIXED ROUTINES
   */
  const fixedEvents =
    useMemo(
      () => {
        const events:
          DayEvent[] =
          []

        classes
          .filter(
            item =>
              item.day ===
              selectedDayName
          )
          .forEach(
            (
              item,
              index
            ) => {
              events.push({
                id:
                  `class-${item.id}`,

                title:
                  item.subject,

                subtitle:
                  'Class',

                startTime:
                  item.startTime,

                endTime:
                  item.endTime,

                type:
                  'class',

                fixed:
                  true,

                color:
                  CLASS_COLORS[
                    index %
                      CLASS_COLORS.length
                  ],

                venue:
                  item.venue ||
                  '',

                lecturer:
                  item.lecturer ||
                  '',
              })
            }
          )

        routines
          .filter(
            routine =>
              routine.type ===
                'fixed' &&
              routine.days.includes(
                selectedDayName
              ) &&
              routine.startTime &&
              routine.endTime
          )
          .forEach(
            routine => {
              events.push({
                id:
                  `routine-${routine.id}`,

                title:
                  routine.name,

                subtitle:
                  'Fixed routine',

                startTime:
                  routine.startTime!,

                endTime:
                  routine.endTime!,

                type:
                  'routine',

                fixed:
                  true,

                color:
                  'bg-emerald-500 border-emerald-400',
              })
            }
          )

        return events.sort(
          (
            a,
            b
          ) =>
            a.startTime.localeCompare(
              b.startTime
            )
        )
      },
      [
        classes,
        routines,
        selectedDayName,
      ]
    )

  /*
   * GENERATED STUDY PLAN
   */
  const studyEvents =
    useMemo(
      () => {
        return studyPlan
          .filter(
            session =>
              session.scheduledDate ===
              selectedDateKey
          )
          .filter(
            session =>
              Boolean(
                session.startTime &&
                session.endTime
              )
          )
          .map(
            session =>
              ({
                id:
                  `study-${session.id}`,

                title:
                  `Study ${session.subject}`,

                subtitle:
                  session.reason ||
                  'Study plan',

                startTime:
                  session.startTime,

                endTime:
                  session.endTime,

                type:
                  'study',

                fixed:
                  true,

                color:
                  'bg-violet-500 border-violet-400',
              } as DayEvent)
          )
          .sort(
            (
              a,
              b
            ) =>
              a.startTime.localeCompare(
                b.startTime
              )
          )
      },
      [
        studyPlan,
        selectedDateKey,
      ]
    )

  /*
   * FIXED TASKS FROM SUPABASE
   *
   * These are already scheduled by the user,
   * so they go directly onto the timeline.
   */
  const fixedTaskEvents =
    useMemo(
      () => {
        return allTasks
          .filter(
            task =>
              !task.completed &&
              task.schedulingType ===
                'fixed' &&
              task.scheduledDate ===
                selectedDateKey &&
              Boolean(
                task.scheduledTime
              )
          )
          .map(
            task => {
              const startMinutes =
                timeToMinutes(
                  task.scheduledTime
                )

              const durationMinutes =
                Math.max(
                  task.durationMinutes ||
                    durationToMinutes(
                      task.duration
                    ),
                  15
                )

              return {
                id:
                  `fixed-task-${task.id}`,

                title:
                  task.title,

                subtitle:
                  task.subject ||
                  'Task',

                startTime:
                  task.scheduledTime,

                endTime:
                  minutesToTime(
                    startMinutes +
                      durationMinutes
                  ),

                type:
                  'fixed-task',

                fixed:
                  true,

                color:
                  'bg-amber-500 border-amber-400',

                taskId:
                  task.id,
              } as DayEvent
            }
          )
          .sort(
            (
              a,
              b
            ) =>
              a.startTime.localeCompare(
                b.startTime
              )
          )
      },
      [
        allTasks,
        selectedDateKey,
      ]
    )

  const flexibleRoutines =
    routines.filter(
      routine =>
        routine.type ===
        'flexible'
    )

  /*
   * Only FLEXIBLE tasks are candidates for Auto Plan.
   *
   * Fixed tasks are already represented by
   * fixedTaskEvents above.
   */
  const tasksForDay =
    allTasks.filter(
      task =>
        !task.completed &&
        task.schedulingType ===
          'flexible' &&
        task.dueDate ===
          selectedDateKey
    )

  const completedTasksForDay =
    allTasks.filter(
      task =>
        task.completed &&
        (
          task.dueDate ===
            selectedDateKey ||
          task.scheduledDate ===
            selectedDateKey
        )
    )

  /*
   * EVENTS THAT ARE ALREADY BLOCKING TIME
   *
   * Fixed tasks are included here so Auto Plan
   * cannot place another item on top of them.
   */
  const baseDayEvents = [
    ...fixedEvents,
    ...studyEvents,
    ...fixedTaskEvents,
  ]

  const allDayEvents = [
    ...baseDayEvents,
    ...plannedEvents,
  ].sort(
    (
      a,
      b
    ) =>
      a.startTime.localeCompare(
        b.startTime
      )
  )

  const totalItems =
    fixedEvents.length +
    studyEvents.length +
    fixedTaskEvents.length +
    tasksForDay.length +
    flexibleRoutines.length

  const completedCount =
    completedTasksForDay.length

  const progress =
    totalItems +
      completedCount ===
    0
      ? 0
      : Math.round(
          (
            completedCount /
            (
              totalItems +
              completedCount
            )
          ) *
            100
        )

  const resetPlan =
    () => {
      setPlannedEvents(
        []
      )

      setAutoPlanDone(
        false
      )

      setSelectedClass(
        null
      )

      setSelectedTask(
        null
      )
    }

  const goPreviousDay =
    () => {
      const previous =
        new Date(
          selectedDate
        )

      previous.setDate(
        previous.getDate() -
          1
      )

      setSelectedDate(
        previous
      )

      resetPlan()
    }

  const goNextDay =
    () => {
      const next =
        new Date(
          selectedDate
        )

      next.setDate(
        next.getDate() +
          1
      )

      setSelectedDate(
        next
      )

      resetPlan()
    }

  const goToday =
    () => {
      setSelectedDate(
        new Date()
      )

      resetPlan()
    }

  /*
   * AUTO PLAN
   */
  const handleAutoPlan =
    () => {
      const wakeTime =
        userProfile
          ?.wakeUpTime ??
        '06:00'

      const sleepTime =
        userProfile
          ?.bedtime ??
        '23:00'

      const dayStart =
        timeToMinutes(
          wakeTime
        )

      let dayEnd =
        timeToMinutes(
          sleepTime
        )

      if (
        dayEnd <=
        dayStart
      ) {
        dayEnd +=
          1440
      }

      const busyBlocks:
        TimeBlock[] =
        baseDayEvents.map(
          event => ({
            start:
              timeToMinutes(
                event.startTime
              ),

            end:
              timeToMinutes(
                event.endTime
              ),
          })
        )

      const generated:
        DayEvent[] =
        []

      const studyWindows =
        getStudyWindows(
          studyPreferences
        )

      const itemsToSchedule =
        [
          ...tasksForDay.map(
            task => ({
              id:
                task.id,

              title:
                task.title,

              subtitle:
                task.subject ||
                'Task',

              duration:
                durationToMinutes(
                  task.duration
                ),

              academic:
                isAcademicTask(
                  task,
                  subjects
                ),

              type:
                'task' as const,
            })
          ),

          ...flexibleRoutines.map(
            routine => ({
              id:
                routine.id,

              title:
                routine.name,

              subtitle:
                'Flexible routine',

              duration:
                routine
                  .durationMinutes ??
                30,

              academic:
                false,

              type:
                'planned-routine' as const,
            })
          ),
        ]

      itemsToSchedule.sort(
        (
          a,
          b
        ) => {
          if (
            a.academic &&
            !b.academic
          ) {
            return -1
          }

          if (
            !a.academic &&
            b.academic
          ) {
            return 1
          }

          return (
            b.duration -
            a.duration
          )
        }
      )

      itemsToSchedule.forEach(
        item => {
          const freeBlocks =
            getFreeBlocks(
              dayStart,
              dayEnd,
              busyBlocks
            )

          const slot =
            findSlot(
              item.duration,
              freeBlocks,
              item.academic
                ? studyWindows
                : undefined
            )

          if (!slot) {
            return
          }

          const event:
            DayEvent = {
            id:
              `planned-${item.type}-${item.id}`,

            title:
              item.title,

            subtitle:
              item.subtitle,

            startTime:
              minutesToTime(
                slot.start
              ),

            endTime:
              minutesToTime(
                slot.end
              ),

            type:
              item.type,

            fixed:
              false,

            color:
              item.type ===
              'task'
                ? 'bg-amber-500 border-amber-400'
                : 'bg-teal-500 border-teal-400',

            taskId:
              item.type ===
              'task'
                ? item.id
                : undefined,
          }

          generated.push(
            event
          )

          busyBlocks.push({
            start:
              slot.start,

            end:
              slot.end,
          })
        }
      )

      setPlannedEvents(
        generated
      )

      setAutoPlanDone(
        true
      )
    }

  /*
   * OPEN TIMELINE EVENT
   */
  const openTimelineEvent =
    (
      event:
        DayEvent
    ) => {
      if (
        event.type ===
        'class'
      ) {
        setSelectedClass(
          event
        )

        return
      }

      if (
        (
          event.type ===
            'task' ||
          event.type ===
            'fixed-task'
        ) &&
        event.taskId
      ) {
        const task =
          allTasks.find(
            item =>
              item.id ===
              event.taskId
          )

        if (task) {
          setSelectedTask(
            task
          )
        }
      }
    }

  /*
   * TIMELINE EVENT
   */
  const renderEvent =
    (
      event:
        DayEvent
    ) => {
      const startDecimal =
        timeToMinutes(
          event.startTime
        ) / 60

      let endDecimal =
        timeToMinutes(
          event.endTime
        ) / 60

      if (
        endDecimal <
        startDecimal
      ) {
        endDecimal +=
          24
      }

      const top =
        (
          startDecimal -
          START_HOUR
        ) *
        HOUR_HEIGHT

      const height =
        (
          endDecimal -
          startDecimal
        ) *
        HOUR_HEIGHT

      if (
        endDecimal <
          START_HOUR ||
        startDecimal >
          START_HOUR +
            HOURS.length
      ) {
        return null
      }

      const clickable =
        event.type ===
          'class' ||
        event.type ===
          'task' ||
        event.type ===
          'fixed-task'

      return (
        <button
          type="button"
          key={
            event.id
          }
          onClick={() =>
            openTimelineEvent(
              event
            )
          }
          className={`absolute left-2 right-2 rounded-xl border px-3 py-2 ${event.color} text-white hover:brightness-95 transition-all text-left ${
            clickable
              ? 'cursor-pointer'
              : 'cursor-default'
          }`}
          style={{
            top:
              Math.max(
                top,
                0
              ) + 1,

            height:
              Math.max(
                height - 2,
                36
              ),
          }}
        >

          <div className="flex items-start justify-between gap-2 h-full overflow-hidden">

            <div className="min-w-0">

              <div className="flex items-center gap-1.5">

                {event.type ===
                'study' ? (
                  <BookOpen
                    size={9}
                    className="opacity-80 flex-shrink-0"
                  />
                ) : event.type ===
                    'task' ||
                  event.type ===
                    'fixed-task' ? (
                  <CheckSquare
                    size={9}
                    className="opacity-80 flex-shrink-0"
                  />
                ) : event.fixed ? (
                  <Lock
                    size={9}
                    className="opacity-70 flex-shrink-0"
                  />
                ) : (
                  <Shuffle
                    size={9}
                    className="opacity-70 flex-shrink-0"
                  />
                )}

                <span className="font-semibold text-xs truncate">
                  {
                    event.title
                  }
                </span>

              </div>

              {height > 46 && (
                <p className="text-xs opacity-75 truncate mt-0.5">
                  {
                    event.subtitle
                  }
                </p>
              )}

              {event.type ===
                'class' &&
                event.venue &&
                height > 70 && (
                  <div className="flex items-center gap-1 text-xs opacity-75 truncate mt-1">

                    <MapPin
                      size={9}
                      className="flex-shrink-0"
                    />

                    <span className="truncate">
                      {
                        event.venue
                      }
                    </span>

                  </div>
                )}

            </div>

            <span
              className="font-mono opacity-80 flex-shrink-0 whitespace-nowrap"
              style={{
                fontSize:
                  10,
              }}
            >
              {formatTime(
                event.startTime
              )}
            </span>

          </div>

        </button>
      )
    }

  const viewingToday =
    getDateKey(
      new Date()
    ) ===
    selectedDateKey

  const unscheduledCount =
    Math.max(
      0,
      tasksForDay.length +
        flexibleRoutines.length -
        plannedEvents.length
    )

  return (
    <div className="flex flex-col h-full">

      {/* HEADER */}
      <div className="px-6 lg:px-8 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">

        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">

          <div>

            <h1 className="font-display font-800 text-2xl text-slate-900 dark:text-white">
              My Day
            </h1>

            <div className="flex items-center gap-2 mt-1">

              <button
                type="button"
                onClick={
                  goPreviousDay
                }
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <ChevronLeft
                  size={16}
                />
              </button>

              <span className="text-sm text-slate-600 dark:text-slate-400 font-medium min-w-44 text-center">
                {formatDate(
                  selectedDate
                )}
              </span>

              <button
                type="button"
                onClick={
                  goNextDay
                }
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <ChevronRight
                  size={16}
                />
              </button>

              {!viewingToday && (
                <button
                  type="button"
                  onClick={
                    goToday
                  }
                  className="ml-2 text-xs font-medium text-indigo-600 dark:text-indigo-400"
                >
                  Today
                </button>
              )}

            </div>

          </div>

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={
                handleAutoPlan
              }
              className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-sm font-medium px-4 py-2 rounded-xl transition-all"
            >
              <Zap
                size={14}
              />

              {autoPlanDone
                ? 'Replan My Day'
                : 'Auto Plan My Day'}
            </button>

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

        </div>

        {/* STATS */}
        <div className="flex flex-wrap items-center gap-6">

          <div className="flex items-center gap-1.5">

            <div className="w-2 h-2 rounded-full bg-indigo-500" />

            <span className="text-sm text-slate-600 dark:text-slate-400">
              {
                fixedEvents.filter(
                  event =>
                    event.type ===
                    'class'
                ).length
              }{' '}
              classes
            </span>

          </div>

          <div className="flex items-center gap-1.5">

            <div className="w-2 h-2 rounded-full bg-emerald-500" />

            <span className="text-sm text-slate-600 dark:text-slate-400">
              {
                fixedEvents.filter(
                  event =>
                    event.type ===
                    'routine'
                ).length
              }{' '}
              fixed routines
            </span>

          </div>

          <div className="flex items-center gap-1.5">

            <div className="w-2 h-2 rounded-full bg-violet-500" />

            <span className="text-sm text-slate-600 dark:text-slate-400">
              {studyPlanLoading
                ? 'Loading study plan...'
                : `${studyEvents.length} ${
                    studyEvents.length ===
                    1
                      ? 'study session'
                      : 'study sessions'
                  }`}
            </span>

          </div>

          <div className="flex items-center gap-1.5">

            <div className="w-2 h-2 rounded-full bg-amber-500" />

            <span className="text-sm text-slate-600 dark:text-slate-400">
              {
                fixedTaskEvents.length
              }{' '}
              fixed tasks
            </span>

          </div>

          <div className="flex items-center gap-1.5">

            <div className="w-2 h-2 rounded-full bg-orange-400" />

            <span className="text-sm text-slate-600 dark:text-slate-400">
              {
                tasksForDay.length
              }{' '}
              flexible tasks due
            </span>

          </div>

          <div className="flex items-center gap-1.5">

            <div className="w-2 h-2 rounded-full bg-teal-500" />

            <span className="text-sm text-slate-600 dark:text-slate-400">
              {
                flexibleRoutines.length
              }{' '}
              flexible routines
            </span>

          </div>

          {autoPlanDone && (
            <div className="flex items-center gap-1.5">

              <CheckCircle2
                size={13}
                className="text-indigo-500"
              />

              <span className="text-sm text-indigo-600 dark:text-indigo-400">
                {
                  plannedEvents.length
                }{' '}
                items planned
              </span>

            </div>
          )}

        </div>

        <div className="mt-3 w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">

          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
            style={{
              width:
                `${progress}%`,
            }}
          />

        </div>

      </div>

      <div className="flex-1 overflow-y-auto">

        {/* STUDY PLAN INFO */}
        {studyEvents.length >
          0 && (
          <div className="px-6 lg:px-8 pt-5">

            <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900 rounded-2xl p-4">

              <div className="flex items-start gap-3">

                <Sparkles
                  size={17}
                  className="text-violet-600 dark:text-violet-400 mt-0.5"
                />

                <div>

                  <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">
                    Study plan active
                  </p>

                  <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                    {studyEvents.length}{' '}
                    {studyEvents.length ===
                    1
                      ? 'study session is'
                      : 'study sessions are'}{' '}
                    scheduled for {formatDate(selectedDate)}. Auto Plan will work around these sessions.
                  </p>

                </div>

              </div>

            </div>

          </div>
        )}

        {/* FIXED TASK INFO */}
        {fixedTaskEvents.length >
          0 && (
          <div className="px-6 lg:px-8 pt-5">

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl p-4">

              <div className="flex items-start gap-3">

                <Lock
                  size={17}
                  className="text-amber-600 dark:text-amber-400 mt-0.5"
                />

                <div>

                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                    Fixed tasks scheduled
                  </p>

                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    {fixedTaskEvents.length}{' '}
                    {fixedTaskEvents.length ===
                    1
                      ? 'task is'
                      : 'tasks are'}{' '}
                    fixed to a specific time on {formatDate(selectedDate)}. Auto Plan will work around {fixedTaskEvents.length === 1 ? 'it' : 'them'}.
                  </p>

                </div>

              </div>

            </div>

          </div>
        )}

        {/* AUTO PLAN SUMMARY */}
        {autoPlanDone && (
          <div className="px-6 lg:px-8 pt-5">

            <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4">

              <div className="flex items-start gap-3">

                <Zap
                  size={17}
                  className="text-indigo-600 dark:text-indigo-400 mt-0.5"
                />

                <div>

                  <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">
                    Your day has been planned
                  </p>

                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                    My Scheduler placed{' '}
                    {plannedEvents.length}{' '}
                    flexible items around your classes, routines, study plan and fixed tasks.

                    {unscheduledCount > 0
                      ? ` ${unscheduledCount} item(s) could not fit into the remaining available time.`
                      : ' Everything fit into your available time.'}
                  </p>

                </div>

              </div>

            </div>

          </div>
        )}

        {/* TIMELINE */}
        <div className="flex min-h-full mt-5">

          {/* HOURS */}
          <div className="w-16 flex-shrink-0 relative">

            {HOURS.map(
              hour => (
                <div
                  key={hour}
                  className="absolute w-full flex items-start justify-end pr-3"
                  style={{
                    top:
                      (
                        hour -
                        START_HOUR
                      ) *
                      HOUR_HEIGHT,

                    height:
                      HOUR_HEIGHT,
                  }}
                >

                  <span className="font-mono text-xs text-slate-400 dark:text-slate-500 leading-none pt-0.5">
                    {formatHour(
                      hour
                    )}
                  </span>

                </div>
              )
            )}

            <div
              style={{
                height:
                  HOURS.length *
                  HOUR_HEIGHT,
              }}
            />

          </div>

          {/* GRID */}
          <div className="flex-1 relative border-l border-slate-100 dark:border-slate-800 mr-6">

            {HOURS.map(
              hour => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t border-slate-100 dark:border-slate-800"
                  style={{
                    top:
                      (
                        hour -
                        START_HOUR
                      ) *
                      HOUR_HEIGHT,
                  }}
                />
              )
            )}

            {/* CURRENT TIME */}
            {viewingToday &&
              (() => {
                const now =
                  new Date()

                const decimal =
                  now.getHours() +
                  now.getMinutes() /
                    60

                if (
                  decimal <
                    START_HOUR ||
                  decimal >
                    START_HOUR +
                      HOURS.length
                ) {
                  return null
                }

                return (
                  <div
                    className="absolute left-0 right-0 flex items-center z-20"
                    style={{
                      top:
                        (
                          decimal -
                          START_HOUR
                        ) *
                        HOUR_HEIGHT,
                    }}
                  >

                    <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5" />

                    <div className="flex-1 h-0.5 bg-red-500" />

                  </div>
                )
              })()}

            {/* EVENTS */}
            {allDayEvents.map(
              renderEvent
            )}

            {/* EMPTY STATE */}
            {allDayEvents.length ===
              0 && (
              <div className="absolute inset-x-8 top-24 text-center">

                <CalendarDays
                  size={30}
                  className="mx-auto text-slate-300 dark:text-slate-600 mb-3"
                />

                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Your day is open
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  Add tasks, routines or generate a study plan.
                </p>

              </div>
            )}

            <div
              style={{
                height:
                  HOURS.length *
                  HOUR_HEIGHT,
              }}
            />

          </div>

        </div>

      </div>

      {/* ADD TASK MODAL */}
      {showAddTask && (
        <AddTaskModal
          defaultDueDate={
            selectedDateKey
          }
          onClose={() =>
            setShowAddTask(
              false
            )
          }
          onTaskAdded={() => {
            setTaskRefreshKey(
              value =>
                value +
                1
            )

            setAutoPlanDone(
              false
            )

            setPlannedEvents(
              []
            )
          }}
        />
      )}

      {/* CLASS DETAILS MODAL */}
      {selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() =>
              setSelectedClass(
                null
              )
            }
          />

          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6">

            <div className="flex items-start justify-between gap-4 mb-5">

              <div>

                <div className="flex items-center gap-2 mb-1">

                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />

                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Class
                  </span>

                </div>

                <h2 className="font-display font-700 text-xl text-slate-900 dark:text-white">
                  {selectedClass.title}
                </h2>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedClass(
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

              <div className="flex items-start gap-3">

                <CalendarDays
                  size={16}
                  className="text-slate-400 mt-0.5"
                />

                <div>

                  <p className="text-xs text-slate-400">
                    Day
                  </p>

                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {selectedDayName}
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
                    Time
                  </p>

                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {formatTime(
                      selectedClass.startTime
                    )}{' '}
                    –{' '}
                    {formatTime(
                      selectedClass.endTime
                    )}
                  </p>

                </div>

              </div>

              <div className="flex items-start gap-3">

                <MapPin
                  size={16}
                  className="text-slate-400 mt-0.5"
                />

                <div>

                  <p className="text-xs text-slate-400">
                    Venue
                  </p>

                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {selectedClass.venue?.trim() ||
                      'Venue not set'}
                  </p>

                </div>

              </div>

              <div className="flex items-start gap-3">

                <UserRound
                  size={16}
                  className="text-slate-400 mt-0.5"
                />

                <div>

                  <p className="text-xs text-slate-400">
                    Lecturer
                  </p>

                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {selectedClass.lecturer?.trim() ||
                      'Lecturer not set'}
                  </p>

                </div>

              </div>

              <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-xl px-4 py-3">

                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                  This information comes from your recurring academic timetable.
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                setSelectedClass(
                  null
                )
              }
              className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl"
            >
              Done
            </button>

          </div>

        </div>
      )}

      {/* TASK DETAILS MODAL */}
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
                    className="text-amber-500"
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
                  {selectedTask.title}
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

                <CalendarDays
                  size={16}
                  className="text-slate-400 mt-0.5"
                />

                <div>

                  <p className="text-xs text-slate-400">
                    Due date
                  </p>

                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {formatTaskDueDate(
                      selectedTask.dueDate
                    )}
                  </p>

                  {selectedTask.dueDate &&
                    calculateDaysUntilDue(
                      selectedTask.dueDate
                    ) < 0 && (
                      <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">

                        <AlertCircle
                          size={10}
                        />

                        {Math.abs(
                          calculateDaysUntilDue(
                            selectedTask.dueDate
                          )
                        )}{' '}
                        days overdue

                      </p>
                    )}

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
                    {selectedTask.duration}
                  </p>

                </div>

              </div>

              <div>

                <p className="text-xs text-slate-400 mb-1.5">
                  Priority
                </p>

                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                    PRIORITY_STYLES[
                      selectedTask.priority
                    ].className
                  }`}
                >
                  {
                    PRIORITY_STYLES[
                      selectedTask.priority
                    ].label
                  }
                </span>

              </div>

              <div
                className={`rounded-xl border px-4 py-3 ${
                  selectedTask.completed
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'
                    : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
                }`}
              >

                <p
                  className={`text-xs ${
                    selectedTask.completed
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {selectedTask.completed
                    ? 'This task has been completed.'
                    : (selectedTask as ScheduledTask).schedulingType ===
                        'fixed'
                      ? `This task is fixed for ${formatTime(
                          (selectedTask as ScheduledTask).scheduledTime
                        )}.`
                      : 'Auto Plan can place this flexible task into an available gap in your day.'}
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                setSelectedTask(
                  null
                )
              }
              className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl"
            >
              Done
            </button>

          </div>

        </div>
      )}

    </div>
  )
}