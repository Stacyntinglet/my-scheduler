import { useEffect, useState } from 'react'

import type {
  View,
  UserProfile,
  ClassScheduleItem,
  Task,
  Assessment,
} from '../types'

import { supabase } from '../utils/supabase'

import {
  Zap,
  Clock,
  BookOpen,
  ChevronRight,
  Lock,
  CalendarDays,
  Plus,
  CheckCircle2,
  GraduationCap,
  AlertCircle,
  CheckSquare,
  Shuffle,
  MapPin,
  UserRound,
} from 'lucide-react'

interface DashboardProps {
  userProfile: UserProfile | null
  onNavigate: (view: View) => void
  onQuickAdd: () => void
}

interface AssessmentRow {
  id: string
  subject_id: string | null
  subject: string | null
  assessment_type?: string | null
  type?: string | null
  assessment_date?: string | null
  due_date?: string | null
}

interface AssessmentTopicRow {
  id: string
  assessment_id: string
  name: string
  done?: boolean | null
  completed?: boolean | null
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

const SUBJECT_COLORS = [
  'bg-indigo-500',
  'bg-violet-500',
  'bg-blue-500',
  'bg-cyan-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
]

const SUBJECT_STYLE_MAP = [
  {
    dotColor: '#6366f1',
    bgLight: '#eef2ff',
    textColor: '#4338ca',
  },
  {
    dotColor: '#8b5cf6',
    bgLight: '#f5f3ff',
    textColor: '#6d28d9',
  },
  {
    dotColor: '#3b82f6',
    bgLight: '#eff6ff',
    textColor: '#1d4ed8',
  },
  {
    dotColor: '#06b6d4',
    bgLight: '#ecfeff',
    textColor: '#0e7490',
  },
  {
    dotColor: '#10b981',
    bgLight: '#ecfdf5',
    textColor: '#047857',
  },
  {
    dotColor: '#f59e0b',
    bgLight: '#fffbeb',
    textColor: '#b45309',
  },
  {
    dotColor: '#f43f5e',
    bgLight: '#fff1f2',
    textColor: '#be123c',
  },
]

function formatTime(time: string) {
  if (!time) return ''

  const [hourString, minute] =
    time.split(':')

  const hour =
    Number(hourString)

  const ampm =
    hour >= 12
      ? 'PM'
      : 'AM'

  const displayHour =
    hour % 12 || 12

  return `${displayHour}:${minute} ${ampm}`
}

function getCurrentGreeting() {
  const hour =
    new Date().getHours()

  if (hour < 12) {
    return 'Good morning'
  }

  if (hour < 18) {
    return 'Good afternoon'
  }

  return 'Good evening'
}

function getGreetingEmoji() {
  const hour =
    new Date().getHours()

  if (hour < 12) {
    return '☀️'
  }

  if (hour < 18) {
    return '🌤️'
  }

  return '🌙'
}

function getTodayName() {
  return DAYS[
    new Date().getDay()
  ]
}

function getFormattedDate() {
  return new Intl.DateTimeFormat(
    'en-US',
    {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }
  ).format(new Date())
}

function getTodayDateKey() {
  const today =
    new Date()

  const year =
    today.getFullYear()

  const month =
    String(
      today.getMonth() + 1
    ).padStart(2, '0')

  const day =
    String(
      today.getDate()
    ).padStart(2, '0')

  return `${year}-${month}-${day}`
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
    return 'Due today'
  }

  if (days === 1) {
    return 'Due tomorrow'
  }

  if (days < 0) {
    return `${Math.abs(
      days
    )}d overdue`
  }

  return `Due in ${days} days`
}

function sortClassesByTime(
  classes: ClassScheduleItem[]
) {
  return [
    ...classes,
  ].sort(
    (a, b) =>
      a.startTime.localeCompare(
        b.startTime
      )
  )
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
    const number =
      Number.parseFloat(
        normalized
      )

    if (
      !Number.isNaN(
        number
      )
    ) {
      total =
        number
    }
  }

  return Math.max(
    Math.round(total),
    15
  )
}

function formatDurationMinutes(
  minutes: number
) {
  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours =
    Math.floor(
      minutes / 60
    )

  const remaining =
    minutes % 60

  if (remaining === 0) {
    return `${hours}h`
  }

  return `${hours}h ${remaining}m`
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

export default function Dashboard({
  userProfile,
  onNavigate,
  onQuickAdd,
}: DashboardProps) {
  const [
    focusTaskIndex,
    setFocusTaskIndex,
  ] = useState(0)

  const [
    tasks,
    setTasks,
  ] = useState<Task[]>([])

  const [
    assessments,
    setAssessments,
  ] = useState<Assessment[]>([])

  const [
    assessmentDates,
    setAssessmentDates,
  ] = useState<
    Record<string, string>
  >({})

  const userName =
    userProfile?.name?.trim() ||
    'Student'

  const subjects =
    userProfile?.subjects ?? []

  const classes =
    userProfile?.classes ?? []

  const routines =
    userProfile?.routines ?? []

  const weeklyStudyGoal =
    userProfile?.studyHoursPerWeek ??
    0

  /*
   * LOAD TASKS FROM SUPABASE
   */
  useEffect(() => {
    let cancelled = false

    async function loadTasksFromSupabase() {
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
          if (!cancelled) {
            setTasks([])
          }

          return
        }

        const {
          data,
          error: tasksError,
        } =
          await supabase
            .from('tasks')
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
            .order(
              'created_at',
              {
                ascending: false,
              }
            )

        if (tasksError) {
          throw tasksError
        }

        const loadedTasks: Task[] =
          (data ?? []).map(
            task => {
              const dueDate =
                task.due_date
                  ? task.due_date.slice(
                      0,
                      10
                    )
                  : ''

              const totalMinutes =
                Math.max(
                  0,
                  Number(
                    task.duration_minutes ??
                    0
                  )
                )

              const taskPriority:
                Task['priority'] =
                task.priority ===
                  'high' ||
                task.priority ===
                  'low'
                  ? task.priority
                  : 'medium'

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
                    totalMinutes
                  ),

                priority:
                  taskPriority,

                completed:
                  Boolean(
                    task.completed
                  ),
              }
            }
          )

        if (!cancelled) {
          setTasks(
            loadedTasks
          )
        }
      } catch (error) {
        console.error(
          'Failed to load Dashboard tasks from Supabase:',
          error
        )

        if (!cancelled) {
          setTasks([])
        }
      }
    }

    loadTasksFromSupabase()

    return () => {
      cancelled = true
    }
  }, [])

  /*
   * LOAD ASSESSMENTS + TOPICS FROM SUPABASE
   */
  useEffect(() => {
    let cancelled = false

    async function loadAssessmentsFromSupabase() {
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
          if (!cancelled) {
            setAssessments([])
            setAssessmentDates({})
          }

          return
        }

        const {
          data: assessmentRows,
          error: assessmentError,
        } =
          await supabase
            .from('assessments')
            .select('*')
            .eq(
              'user_id',
              user.id
            )
            .order(
              'created_at',
              {
                ascending: true,
              }
            )

        if (assessmentError) {
          throw assessmentError
        }

        const typedAssessments =
          (
            assessmentRows ??
            []
          ) as AssessmentRow[]

        const assessmentIds =
          typedAssessments.map(
            assessment =>
              assessment.id
          )

        let topicRows:
          AssessmentTopicRow[] = []

        if (
          assessmentIds.length >
          0
        ) {
          const {
            data,
            error: topicsError,
          } =
            await supabase
              .from(
                'assessment_topics'
              )
              .select('*')
              .in(
                'assessment_id',
                assessmentIds
              )

          if (topicsError) {
            throw topicsError
          }

          topicRows =
            (
              data ??
              []
            ) as AssessmentTopicRow[]
        }

        const dates:
          Record<string, string> =
          {}

        const loadedAssessments:
          Assessment[] =
          typedAssessments.map(
            (
              assessment,
              index
            ) => {
              const topics =
                topicRows.filter(
                  topic =>
                    topic.assessment_id ===
                    assessment.id
                )

              const mappedTopics =
                topics.map(
                  topic => ({
                    name:
                      topic.name,

                    done:
                      Boolean(
                        topic.done ??
                        topic.completed
                      ),
                  })
                )

              const completedTopics =
                mappedTopics.filter(
                  topic =>
                    topic.done
                ).length

              const progress =
                mappedTopics.length ===
                0
                  ? 0
                  : Math.round(
                      (
                        completedTopics /
                        mappedTopics.length
                      ) *
                        100
                    )

              const style =
                SUBJECT_STYLE_MAP[
                  index %
                    SUBJECT_STYLE_MAP.length
                ]

              const assessmentDate =
                assessment.assessment_date ??
                assessment.due_date ??
                ''

              if (
                assessmentDate
              ) {
                dates[
                  assessment.id
                ] =
                  assessmentDate.slice(
                    0,
                    10
                  )
              }

              return {
                id:
                  assessment.id,

                subject:
                  assessment.subject ??
                  'Untitled subject',

                dotColor:
                  style.dotColor,

                type:
                  assessment.assessment_type ??
                  assessment.type ??
                  'Assessment',

                daysLeft:
                  assessmentDate
                    ? calculateDaysUntilDue(
                        assessmentDate.slice(
                          0,
                          10
                        )
                      )
                    : Number.POSITIVE_INFINITY,

                topics:
                  mappedTopics,

                progress,
              }
            }
          )

        if (!cancelled) {
          setAssessments(
            loadedAssessments
          )

          setAssessmentDates(
            dates
          )

        }
      } catch (error) {
        console.error(
          'Failed to load Dashboard assessments from Supabase:',
          error
        )

        if (!cancelled) {
          setAssessments([])
          setAssessmentDates({})
        }
      }
    }

    loadAssessmentsFromSupabase()

    return () => {
      cancelled = true
    }
  }, [])

  const todayName =
    getTodayName()

  const todayDate =
    getTodayDateKey()

  const todaysClasses =
    sortClassesByTime(
      classes.filter(
        classItem =>
          classItem.day ===
          todayName
      )
    )

  const todaysFixedRoutines =
    routines
      .filter(
        routine =>
          routine.type ===
            'fixed' &&
          routine.days.includes(
            todayName
          ) &&
          routine.startTime &&
          routine.endTime
      )
      .sort(
        (a, b) =>
          (
            a.startTime ??
            ''
          ).localeCompare(
            b.startTime ??
            ''
          )
      )

  const flexibleRoutines =
    routines.filter(
      routine =>
        routine.type ===
        'flexible'
    )

  const incompleteTasks =
    tasks.filter(
      task =>
        !task.completed
    )

  const tasksDueToday =
    incompleteTasks.filter(
      task =>
        task.dueDate ===
        todayDate
    )

  const overdueTasks =
    incompleteTasks.filter(
      task =>
        task.dueDate &&
        calculateDaysUntilDue(
          task.dueDate
        ) < 0
    )

  const upcomingTasks =
    incompleteTasks
      .filter(
        task => {
          if (!task.dueDate) {
            return false
          }

          return (
            calculateDaysUntilDue(
              task.dueDate
            ) >= 0
          )
        }
      )
      .sort(
        (a, b) =>
          calculateDaysUntilDue(
            a.dueDate
          ) -
          calculateDaysUntilDue(
            b.dueDate
          )
      )

  const priorityOrder = {
    high: 0,
    medium: 1,
    low: 2,
  }

  const focusCandidates =
    [
      ...overdueTasks,
      ...tasksDueToday,
      ...upcomingTasks,
    ]
      .filter(
        (
          task,
          index,
          array
        ) =>
          array.findIndex(
            item =>
              item.id ===
              task.id
          ) === index
      )
      .sort(
        (a, b) => {
          const priorityDifference =
            priorityOrder[
              a.priority
            ] -
            priorityOrder[
              b.priority
            ]

          if (
            priorityDifference !==
            0
          ) {
            return priorityDifference
          }

          return (
            calculateDaysUntilDue(
              a.dueDate
            ) -
            calculateDaysUntilDue(
              b.dueDate
            )
          )
        }
      )

  const focusTask =
    focusCandidates.length >
    0
      ? focusCandidates[
          focusTaskIndex %
            focusCandidates.length
        ]
      : null

  const nowTime =
    new Date()
      .toTimeString()
      .slice(0, 5)

  const nextClass =
    todaysClasses.find(
      classItem =>
        classItem.startTime >
        nowTime
    ) ??
    todaysClasses[0] ??
    null

  const upcomingAssessments =
    assessments
      .map(
        assessment => ({
          assessment,

          date:
            assessmentDates[
              assessment.id
            ] || '',
        })
      )
      .filter(
        item =>
          item.date &&
          calculateDaysUntilDue(
            item.date
          ) >= 0
      )
      .sort(
        (a, b) =>
          calculateDaysUntilDue(
            a.date
          ) -
          calculateDaysUntilDue(
            b.date
          )
      )

  const scheduledMinutesToday =
    todaysClasses.reduce(
      (
        total,
        classItem
      ) => {
        const [
          startHour,
          startMinute,
        ] =
          classItem.startTime
            .split(':')
            .map(Number)

        const [
          endHour,
          endMinute,
        ] =
          classItem.endTime
            .split(':')
            .map(Number)

        const start =
          startHour *
            60 +
          startMinute

        const end =
          endHour *
            60 +
          endMinute

        return (
          total +
          (end - start)
        )
      },
      0
    ) +
    todaysFixedRoutines.reduce(
      (
        total,
        routine
      ) => {
        if (
          !routine.startTime ||
          !routine.endTime
        ) {
          return total
        }

        const [
          startHour,
          startMinute,
        ] =
          routine.startTime
            .split(':')
            .map(Number)

        const [
          endHour,
          endMinute,
        ] =
          routine.endTime
            .split(':')
            .map(Number)

        return (
          total +
          (
            endHour *
              60 +
            endMinute -
            (
              startHour *
                60 +
              startMinute
            )
          )
        )
      },
      0
    )

  const remainingTaskMinutes =
    tasksDueToday.reduce(
      (
        total,
        task
      ) =>
        total +
        durationToMinutes(
          task.duration
        ),
      0
    )

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">

      <div className="mb-8">
        <h1 className="font-display font-800 text-3xl text-slate-900 dark:text-white">
          {getCurrentGreeting()},{' '}
          {userName}{' '}
          {getGreetingEmoji()}
        </h1>

        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          You have{' '}
          {todaysClasses.length}{' '}
          {todaysClasses.length === 1
            ? 'class'
            : 'classes'}
          ,{' '}
          {tasksDueToday.length}{' '}
          {tasksDueToday.length === 1
            ? 'task'
            : 'tasks'}{' '}
          due today and{' '}
          {todaysFixedRoutines.length}{' '}
          fixed{' '}
          {todaysFixedRoutines.length === 1
            ? 'routine'
            : 'routines'}.

          <span className="ml-2 text-slate-400 dark:text-slate-500">
            {getFormattedDate()}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 space-y-5">

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white">

            <div className="absolute top-0 right-0 w-56 h-56 bg-white/5 rounded-full -translate-y-20 translate-x-16" />

            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-16 -translate-x-10" />

            <div className="relative">

              <div className="flex items-center gap-2 mb-4">

                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <Zap
                    size={14}
                    className="text-white"
                  />
                </div>

                <span className="font-medium text-white/90 text-sm">
                  Focus Now
                </span>

                <span className="ml-auto text-xs bg-white/20 px-2.5 py-1 rounded-full font-medium">
                  Suggested
                </span>
              </div>

              {focusTask ? (
                <>
                  <div className="flex items-start gap-3 mb-3">

                    <div className="text-2xl">
                      ✅
                    </div>

                    <div>
                      <p className="text-white/70 text-xs font-medium mb-0.5">
                        {focusTask.subject ||
                          'Task'}
                      </p>

                      <h3 className="font-display font-700 text-2xl leading-tight">
                        {focusTask.title}
                      </h3>

                      <div className="flex items-center gap-3 mt-1.5 text-white/70 text-sm flex-wrap">

                        <span className="flex items-center gap-1.5">
                          <Clock
                            size={13}
                          />
                          {focusTask.duration}
                        </span>

                        {focusTask.dueDate && (
                          <span>
                            {formatDueDate(
                              focusTask.dueDate
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-white/70 text-sm mb-5 leading-relaxed">
                    This task is currently one of your most urgent unfinished items.
                    My Scheduler can fit it around your classes and fixed routines from My Day.
                  </p>

                  <div className="flex items-center gap-3 flex-wrap">

                    <button
                      type="button"
                      onClick={() =>
                        onNavigate(
                          'myday'
                        )
                      }
                      className="flex items-center gap-2 bg-white text-indigo-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-white/90 transition-colors"
                    >
                      <Zap
                        size={14}
                      />
                      Plan My Day
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (
                          focusCandidates.length <=
                          1
                        ) {
                          return
                        }

                        setFocusTaskIndex(
                          current =>
                            (
                              current +
                              1
                            ) %
                            focusCandidates.length
                        )
                      }}
                      className="text-white/80 hover:text-white text-sm font-medium transition-colors"
                    >
                      Choose Something Else
                    </button>

                  </div>
                </>
              ) : subjects.length >
                0 ? (
                <>
                  <div className="flex items-start gap-3 mb-3">

                    <div className="text-2xl">
                      📚
                    </div>

                    <div>
                      <p className="text-white/70 text-xs font-medium mb-0.5">
                        {subjects[0]}
                      </p>

                      <h3 className="font-display font-700 text-2xl leading-tight">
                        Open study session
                      </h3>

                      <div className="flex items-center gap-1.5 mt-1.5 text-white/70 text-sm">
                        <Clock
                          size={13}
                        />
                        Suggested session · 45 minutes
                      </div>
                    </div>
                  </div>

                  <p className="text-white/70 text-sm mb-5 leading-relaxed">
                    You currently have no urgent tasks, so this is a good opportunity to work toward your {weeklyStudyGoal}-hour weekly study goal.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      onNavigate(
                        'focus'
                      )
                    }
                    className="flex items-center gap-2 bg-white text-indigo-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-white/90 transition-colors"
                  >
                    <Zap
                      size={14}
                    />
                    Start Focus Session
                  </button>
                </>
              ) : (
                <>
                  <h3 className="font-display font-700 text-2xl mb-2">
                    Nothing urgent right now
                  </h3>

                  <p className="text-white/70 text-sm mb-5">
                    Add subjects or tasks and My Scheduler will use them to recommend what deserves your attention.
                  </p>
                </>
              )}

              <div className="mt-4 pt-4 border-t border-white/20">

                {nextClass ? (
                  <div className="space-y-1.5 text-white/70 text-xs">

                    <div className="flex items-center gap-2">
                      <Clock
                        size={12}
                      />

                      <span>
                        Next class: {nextClass.subject} at{' '}
                        {formatTime(
                          nextClass.startTime
                        )}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-5">

                      <span className="flex items-center gap-1.5">
                        <MapPin
                          size={11}
                        />

                        {nextClass.venue?.trim() ||
                          'Venue not set'}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <UserRound
                          size={11}
                        />

                        {nextClass.lecturer?.trim() ||
                          'Lecturer not set'}
                      </span>

                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-white/60 text-xs">
                    <Clock
                      size={12}
                    />
                    No classes remaining today
                  </div>
                )}

              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">

            <div className="flex items-center justify-between mb-4">

              <div>
                <h3 className="font-display font-600 text-base text-slate-900 dark:text-white">
                  Your schedule suggestions
                </h3>

                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                  Flexible items that can be fitted around your fixed commitments.
                </p>
              </div>
            </div>

            {tasksDueToday.length >
              0 ||
            flexibleRoutines.length >
              0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

                {tasksDueToday
                  .slice(
                    0,
                    2
                  )
                  .map(
                    task => (
                      <button
                        type="button"
                        key={
                          task.id
                        }
                        onClick={() =>
                          onNavigate(
                            'myday'
                          )
                        }
                        className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 text-left group hover:ring-1 hover:ring-amber-300 dark:hover:ring-amber-800 transition-all"
                      >
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-0.5 truncate">
                          {task.title}
                        </p>

                        <div className="flex items-center justify-between">

                          <span className="font-mono text-xs text-slate-400">
                            {task.duration}
                          </span>

                          <span className="text-xs text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                            Plan
                          </span>

                        </div>
                      </button>
                    )
                  )}

                {flexibleRoutines
                  .slice(
                    0,
                    2
                  )
                  .map(
                    routine => (
                      <button
                        type="button"
                        key={
                          routine.id
                        }
                        onClick={() =>
                          onNavigate(
                            'myday'
                          )
                        }
                        className="bg-emerald-50 dark:bg-emerald-950/40 rounded-xl p-3 text-left group hover:ring-1 hover:ring-emerald-300 dark:hover:ring-emerald-800 transition-all"
                      >
                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-0.5">
                          {routine.name}
                        </p>

                        <div className="flex items-center justify-between">

                          <span className="font-mono text-xs text-slate-400 flex items-center gap-1">
                            <Shuffle
                              size={10}
                            />

                            {routine.durationMinutes ??
                              0}{' '}
                            min
                          </span>

                          <span className="text-xs text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                            Plan
                          </span>

                        </div>
                      </button>
                    )
                  )}

              </div>
            ) : (
              <div className="py-7 text-center">

                <CheckCircle2
                  size={28}
                  className="mx-auto text-emerald-400 mb-2"
                />

                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nothing waiting to be scheduled
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  Add tasks or flexible routines and they&apos;ll appear here.
                </p>

              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">

            <div className="flex items-center justify-between mb-5">

              <h3 className="font-display font-600 text-base text-slate-900 dark:text-white">
                Today
              </h3>

              <span className="text-xs text-slate-400 dark:text-slate-500">
                {todayName}
              </span>

            </div>

            {todaysClasses.length >
              0 ||
            todaysFixedRoutines.length >
              0 ? (
              <div className="space-y-2">

                {[
                  ...todaysClasses.map(
                    classItem => ({
                      id:
                        `class-${classItem.id}`,

                      title:
                        classItem.subject,

                      type:
                        'Class',

                      startTime:
                        classItem.startTime,

                      endTime:
                        classItem.endTime,

                      className:
                        'bg-indigo-500',

                      venue:
                        classItem.venue ||
                        '',

                      lecturer:
                        classItem.lecturer ||
                        '',
                    })
                  ),

                  ...todaysFixedRoutines.map(
                    routine => ({
                      id:
                        `routine-${routine.id}`,

                      title:
                        routine.name,

                      type:
                        'Fixed routine',

                      startTime:
                        routine.startTime!,

                      endTime:
                        routine.endTime!,

                      className:
                        'bg-emerald-500',

                      venue:
                        '',

                      lecturer:
                        '',
                    })
                  ),
                ]
                  .sort(
                    (a, b) =>
                      a.startTime.localeCompare(
                        b.startTime
                      )
                  )
                  .map(
                    (
                      item,
                      index,
                      list
                    ) => (
                      <div
                        key={
                          item.id
                        }
                        className="flex gap-3"
                      >

                        <div className="flex flex-col items-center">

                          <div
                            className={`w-3 h-3 rounded-full flex-shrink-0 mt-0.5 ${item.className}`}
                          />

                          {index <
                            list.length -
                              1 && (
                            <div
                              className="w-px flex-1 my-0.5 bg-slate-100 dark:bg-slate-800"
                              style={{
                                minHeight:
                                  30,
                              }}
                            />
                          )}

                        </div>

                        <div className="pb-4 flex-1">

                          <div className="flex items-start justify-between gap-2">

                            <div className="min-w-0">

                              <div className="flex items-center gap-2">

                                <span className="font-medium text-sm text-slate-900 dark:text-white">
                                  {item.title}
                                </span>

                                <Lock
                                  size={10}
                                  className="text-slate-400 dark:text-slate-500"
                                />

                              </div>

                              <p className="text-xs text-slate-400 dark:text-slate-500">
                                {item.type}{' '}
                                ·{' '}
                                {formatTime(
                                  item.startTime
                                )}{' '}
                                –{' '}
                                {formatTime(
                                  item.endTime
                                )}
                              </p>

                              {item.type ===
                                'Class' && (
                                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 dark:text-slate-500">

                                  <span className="flex items-center gap-1">
                                    <MapPin
                                      size={10}
                                    />

                                    {item.venue?.trim() ||
                                      'Venue not set'}
                                  </span>

                                  <span className="flex items-center gap-1">
                                    <UserRound
                                      size={10}
                                    />

                                    {item.lecturer?.trim() ||
                                      'Lecturer not set'}
                                  </span>

                                </div>
                              )}

                            </div>

                            <span className="font-mono text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                              {formatTime(
                                item.startTime
                              )}
                            </span>

                          </div>
                        </div>
                      </div>
                    )
                  )}

              </div>
            ) : (
              <div className="py-8 text-center">

                <CheckCircle2
                  size={30}
                  className="mx-auto text-emerald-400 mb-2"
                />

                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No fixed commitments today
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  Your timeline is currently open.
                </p>

              </div>
            )}

          </div>
        </div>

        <div className="space-y-5">

          <div className="grid grid-cols-2 gap-3">

            {[
              {
                label:
                  'Tasks Remaining',

                value:
                  String(
                    incompleteTasks.length
                  ),

                sub:
                  tasksDueToday.length >
                  0
                    ? `${tasksDueToday.length} due today`
                    : 'nothing due today',

                color:
                  'text-indigo-600 dark:text-indigo-400',
              },

              {
                label:
                  'Classes Today',

                value:
                  String(
                    todaysClasses.length
                  ),

                sub:
                  todayName,

                color:
                  'text-violet-600 dark:text-violet-400',
              },

              {
                label:
                  'Scheduled Today',

                value:
                  formatDurationMinutes(
                    scheduledMinutesToday
                  ),

                sub:
                  'fixed commitments',

                color:
                  'text-emerald-600 dark:text-emerald-400',
              },

              {
                label:
                  'Task Time Today',

                value:
                  formatDurationMinutes(
                    remainingTaskMinutes
                  ),

                sub:
                  'estimated work',

                color:
                  'text-amber-600 dark:text-amber-400',
              },
            ].map(
              stat => (
                <div
                  key={
                    stat.label
                  }
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4"
                >

                  <div
                    className={`font-display font-700 text-xl ${stat.color}`}
                  >
                    {stat.value}
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {stat.label}
                  </div>

                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    {stat.sub}
                  </div>

                </div>
              )
            )}

          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">

            <div className="flex items-center justify-between mb-4">

              <h3 className="font-display font-600 text-base text-slate-900 dark:text-white">
                Your Subjects
              </h3>

              <BookOpen
                size={15}
                className="text-slate-400"
              />

            </div>

            {subjects.length >
              0 ? (
              <div className="space-y-1">

                {subjects.map(
                  (
                    subject,
                    index
                  ) => {
                    const subjectClasses =
                      classes.filter(
                        item =>
                          item.subject ===
                          subject
                      )

                    const firstClass =
                      sortClassesByTime(
                        subjectClasses
                      )[0]

                    return (
                      <button
                        type="button"
                        key={
                          subject
                        }
                        onClick={() =>
                          onNavigate(
                            'academics'
                          )
                        }
                        className="w-full flex items-start gap-3 p-2 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >

                        <div
                          className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                            SUBJECT_COLORS[
                              index %
                                SUBJECT_COLORS.length
                            ]
                          }`}
                        />

                        <div className="flex-1 min-w-0">

                          <div className="flex items-center justify-between gap-2">

                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                              {subject}
                            </span>

                            <span className="text-xs text-slate-400 whitespace-nowrap">
                              {subjectClasses.length}{' '}
                              {subjectClasses.length ===
                              1
                                ? 'class'
                                : 'classes'}
                            </span>

                          </div>

                          {firstClass && (
                            <div className="mt-1 space-y-0.5 text-xs text-slate-400 dark:text-slate-500">

                              <div className="flex items-center gap-1.5">
                                <MapPin
                                  size={10}
                                />

                                <span className="truncate">
                                  {firstClass.venue?.trim() ||
                                    'Venue not set'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <UserRound
                                  size={10}
                                />

                                <span className="truncate">
                                  {firstClass.lecturer?.trim() ||
                                    'Lecturer not set'}
                                </span>
                              </div>

                            </div>
                          )}

                        </div>

                        <ChevronRight
                          size={14}
                          className="text-slate-300 dark:text-slate-600 mt-1"
                        />

                      </button>
                    )
                  }
                )}

              </div>
            ) : (
              <p className="text-sm text-slate-400">
                No subjects added yet.
              </p>
            )}

          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">

            <div className="flex items-center justify-between mb-4">

              <h3 className="font-display font-600 text-base text-slate-900 dark:text-white">
                Upcoming Tasks
              </h3>

              <CheckSquare
                size={15}
                className="text-slate-400"
              />

            </div>

            {overdueTasks.length >
              0 ||
            upcomingTasks.length >
              0 ? (
              <div className="space-y-3">

                {overdueTasks
                  .slice(
                    0,
                    2
                  )
                  .map(
                    task => (
                      <button
                        type="button"
                        key={
                          task.id
                        }
                        onClick={() =>
                          onNavigate(
                            'tasks'
                          )
                        }
                        className="w-full flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-xl text-left hover:ring-1 hover:ring-red-200 dark:hover:ring-red-900 transition-all"
                      >

                        <AlertCircle
                          size={14}
                          className="text-red-500 mt-0.5 flex-shrink-0"
                        />

                        <div className="min-w-0 flex-1">

                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                            {task.title}
                          </p>

                          <p className="text-xs text-red-500 mt-0.5">
                            {formatDueDate(
                              task.dueDate
                            )}
                          </p>

                        </div>

                      </button>
                    )
                  )}

                {upcomingTasks
                  .slice(
                    0,
                    Math.max(
                      0,
                      4 -
                        Math.min(
                          overdueTasks.length,
                          2
                        )
                    )
                  )
                  .map(
                    task => (
                      <button
                        type="button"
                        key={
                          task.id
                        }
                        onClick={() =>
                          onNavigate(
                            'tasks'
                          )
                        }
                        className="w-full flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-left hover:ring-1 hover:ring-slate-200 dark:hover:ring-slate-700 transition-all"
                      >

                        <CalendarDays
                          size={14}
                          className="text-indigo-500 mt-0.5 flex-shrink-0"
                        />

                        <div className="min-w-0 flex-1">

                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                            {task.title}
                          </p>

                          <div className="flex items-center justify-between gap-2 mt-0.5">

                            <p className="text-xs text-slate-400">
                              {formatDueDate(
                                task.dueDate
                              )}
                            </p>

                            <span className="text-xs text-slate-400">
                              {task.duration}
                            </span>

                          </div>

                        </div>

                      </button>
                    )
                  )}

              </div>
            ) : (
              <div className="py-6 text-center">

                <CalendarDays
                  size={27}
                  className="mx-auto text-slate-300 dark:text-slate-600 mb-2"
                />

                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No upcoming tasks
                </p>

                <p className="text-xs text-slate-400 mt-1 mb-3">
                  New deadlines will appear here automatically.
                </p>

                <button
                  type="button"
                  onClick={
                    onQuickAdd
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400"
                >
                  <Plus
                    size={13}
                  />
                  Add something
                </button>

              </div>
            )}

          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">

            <div className="flex items-center justify-between mb-4">

              <h3 className="font-display font-600 text-base text-slate-900 dark:text-white">
                Assessments
              </h3>

              <GraduationCap
                size={16}
                className="text-slate-400"
              />

            </div>

            {upcomingAssessments.length >
              0 ? (
              <div className="space-y-3">

                {upcomingAssessments
                  .slice(
                    0,
                    4
                  )
                  .map(
                    ({
                      assessment,
                      date,
                    }) => (
                      <button
                        type="button"
                        key={
                          assessment.id
                        }
                        onClick={() =>
                          onNavigate(
                            'academics'
                          )
                        }
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-left hover:ring-1 hover:ring-slate-200 dark:hover:ring-slate-700 transition-all"
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0">

                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                              {assessment.subject}
                            </p>

                            <p className="text-xs text-slate-400 mt-0.5">
                              {assessment.type}
                            </p>

                          </div>

                          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                            {formatDueDate(
                              date
                            )}
                          </span>

                        </div>

                        <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">

                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{
                              width:
                                `${assessment.progress}%`,
                            }}
                          />

                        </div>

                      </button>
                    )
                  )}

              </div>
            ) : (
              <div className="py-6 text-center">

                <BookOpen
                  size={27}
                  className="mx-auto text-slate-300 dark:text-slate-600 mb-2"
                />

                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No upcoming assessments
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  Exams, tests and assignments with dates will appear here.
                </p>

              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  )
}