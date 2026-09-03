import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Flame,
  Target,
  TrendingUp,
  CheckSquare,
  Clock,
  Calendar,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'

import { supabase } from '../utils/supabase'

interface ProfileRow {
  study_hours_per_week: number | null
  exercise_days_per_week: number | null
}

interface SubjectRow {
  id: string
  name: string
}

interface RoutineRow {
  id: string
  name: string
  days: string[] | null
}

interface TaskRow {
  id: string
  title: string
  subject: string | null
  completed: boolean
  completed_at: string | null
  due_date: string | null
}

interface AssessmentRow {
  id: string
  subject_id: string | null
  subject: string | null
}

interface AssessmentTopicRow {
  id: string
  assessment_id: string
  done: boolean
}

interface FocusSessionRow {
  id: string
  subject_id: string | null
  subject: string
  duration_minutes: number
  completed_at: string
}

interface WeekDayData {
  date: Date
  key: string
  day: string
  studyMinutes: number
  tasks: number
}

interface AcademicProgressItem {
  subject: string
  progress: number
  color: string
  dot: string
}

const SUBJECT_COLORS = [
  {
    color: 'bg-indigo-500',
    dot: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    color: 'bg-violet-500',
    dot: 'text-violet-600 dark:text-violet-400',
  },
  {
    color: 'bg-blue-500',
    dot: 'text-blue-600 dark:text-blue-400',
  },
  {
    color: 'bg-cyan-500',
    dot: 'text-cyan-600 dark:text-cyan-400',
  },
  {
    color: 'bg-emerald-500',
    dot: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    color: 'bg-amber-500',
    dot: 'text-amber-600 dark:text-amber-400',
  },
]

function startOfDay(date: Date) {
  const result = new Date(date)

  result.setHours(
    0,
    0,
    0,
    0
  )

  return result
}

function startOfWeek(date: Date) {
  const result =
    startOfDay(date)

  const day =
    result.getDay()

  const distanceFromMonday =
    day === 0
      ? 6
      : day - 1

  result.setDate(
    result.getDate() -
      distanceFromMonday
  )

  return result
}

function endOfWeek(date: Date) {
  const result =
    startOfWeek(date)

  result.setDate(
    result.getDate() + 7
  )

  return result
}

function dateKey(date: Date) {
  const year =
    date.getFullYear()

  const month =
    String(
      date.getMonth() + 1
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

function parseDate(
  value: string | null
) {
  if (!value) {
    return null
  }

  const dateOnlyMatch =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    )

  if (dateOnlyMatch) {
    const [
      ,
      year,
      month,
      day,
    ] = dateOnlyMatch

    const parsed =
      new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
      )

    if (
      !Number.isNaN(
        parsed.getTime()
      )
    ) {
      return parsed
    }
  }

  const parsed =
    new Date(value)

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null
  }

  return parsed
}

function formatMinutes(
  totalMinutes: number
) {
  const safeMinutes =
    Math.max(
      0,
      Math.round(
        totalMinutes
      )
    )

  const hours =
    Math.floor(
      safeMinutes / 60
    )

  const minutes =
    safeMinutes % 60

  if (hours === 0) {
    return `${minutes}m`
  }

  if (minutes === 0) {
    return `${hours}h`
  }

  return `${hours}h ${minutes}m`
}

function formatStudyGoalProgress(
  totalMinutes: number
) {
  const safeMinutes =
    Math.max(
      0,
      Math.round(
        totalMinutes
      )
    )

  if (
    safeMinutes < 60
  ) {
    return `${safeMinutes} min`
  }

  return formatMinutes(
    safeMinutes
  )
}

function formatShortDate(
  date: Date
) {
  return date.toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
    }
  )
}

function getFocusStreak(
  sessions: FocusSessionRow[]
) {
  if (
    sessions.length ===
    0
  ) {
    return 0
  }

  const uniqueDates =
    Array.from(
      new Set(
        sessions
          .map(
            session => {
              const date =
                new Date(
                  session.completed_at
                )

              if (
                Number.isNaN(
                  date.getTime()
                )
              ) {
                return null
              }

              return dateKey(
                date
              )
            }
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(
                value
              )
          )
      )
    ).sort(
      (
        a,
        b
      ) =>
        b.localeCompare(
          a
        )
    )

  if (
    uniqueDates.length ===
    0
  ) {
    return 0
  }

  const today =
    startOfDay(
      new Date()
    )

  const yesterday =
    new Date(today)

  yesterday.setDate(
    yesterday.getDate() -
      1
  )

  const mostRecent =
    uniqueDates[0]

  if (
    mostRecent !==
      dateKey(today) &&
    mostRecent !==
      dateKey(yesterday)
  ) {
    return 0
  }

  let streak = 0

  const cursor =
    mostRecent ===
    dateKey(today)
      ? new Date(today)
      : new Date(
          yesterday
        )

  while (
    uniqueDates.includes(
      dateKey(cursor)
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

function isExerciseRoutine(
  name: string
) {
  const exerciseWords = [
    'exercise',
    'gym',
    'workout',
    'training',
    'run',
    'running',
    'jog',
    'jogging',
    'fitness',
    'football',
    'basketball',
    'swim',
    'swimming',
    'cycling',
    'cycle',
    'yoga',
    'sport',
  ]

  const lowerName =
    name.toLowerCase()

  return exerciseWords.some(
    word =>
      lowerName.includes(
        word
      )
  )
}

export default function ProgressView() {
  const [
    profile,
    setProfile,
  ] =
    useState<ProfileRow | null>(
      null
    )

  const [
    subjects,
    setSubjects,
  ] =
    useState<SubjectRow[]>(
      []
    )

  const [
    routines,
    setRoutines,
  ] =
    useState<RoutineRow[]>(
      []
    )

  const [
    tasks,
    setTasks,
  ] =
    useState<TaskRow[]>(
      []
    )

  const [
    assessments,
    setAssessments,
  ] =
    useState<
      AssessmentRow[]
    >([])

  const [
    assessmentTopics,
    setAssessmentTopics,
  ] =
    useState<
      AssessmentTopicRow[]
    >([])

  const [
    focusSessions,
    setFocusSessions,
  ] =
    useState<
      FocusSessionRow[]
    >([])

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState('')

  const loadProgressData =
    async (
      manualRefresh = false
    ) => {
      if (
        manualRefresh
      ) {
        setRefreshing(
          true
        )
      } else {
        setLoading(
          true
        )
      }

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
          profileResult,
          subjectsResult,
          routinesResult,
          tasksResult,
          assessmentsResult,
          topicsResult,
          focusResult,
        ] =
          await Promise.all([
            supabase
              .from(
                'profiles'
              )
              .select(
                `
                  study_hours_per_week,
                  exercise_days_per_week
                `
              )
              .eq(
                'id',
                user.id
              )
              .maybeSingle(),

            supabase
              .from(
                'subjects'
              )
              .select(
                `
                  id,
                  name
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
                    true,
                }
              ),

            supabase
              .from(
                'routines'
              )
              .select(
                `
                  id,
                  name,
                  days
                `
              )
              .eq(
                'user_id',
                user.id
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
                  completed,
                  completed_at,
                  due_date
                `
              )
              .eq(
                'user_id',
                user.id
              ),

            supabase
              .from(
                'assessments'
              )
              .select(
                `
                  id,
                  subject_id,
                  subject
                `
              )
              .eq(
                'user_id',
                user.id
              ),

            supabase
              .from(
                'assessment_topics'
              )
              .select(
                `
                  id,
                  assessment_id,
                  done
                `
              )
              .eq(
                'user_id',
                user.id
              ),

            supabase
              .from(
                'focus_sessions'
              )
              .select(
                `
                  id,
                  subject_id,
                  subject,
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
          profileResult.error
        ) {
          throw profileResult.error
        }

        if (
          subjectsResult.error
        ) {
          throw subjectsResult.error
        }

        if (
          routinesResult.error
        ) {
          throw routinesResult.error
        }

        if (
          tasksResult.error
        ) {
          throw tasksResult.error
        }

        if (
          assessmentsResult.error
        ) {
          throw assessmentsResult.error
        }

        if (
          topicsResult.error
        ) {
          throw topicsResult.error
        }

        if (
          focusResult.error
        ) {
          throw focusResult.error
        }

        setProfile(
          (
            profileResult.data ??
            null
          ) as ProfileRow | null
        )

        setSubjects(
          (
            subjectsResult.data ??
            []
          ) as SubjectRow[]
        )

        setRoutines(
          (
            routinesResult.data ??
            []
          ) as RoutineRow[]
        )

        setTasks(
          (
            tasksResult.data ??
            []
          ) as TaskRow[]
        )

        setAssessments(
          (
            assessmentsResult.data ??
            []
          ) as AssessmentRow[]
        )

        setAssessmentTopics(
          (
            topicsResult.data ??
            []
          ) as AssessmentTopicRow[]
        )

        setFocusSessions(
          (
            focusResult.data ??
            []
          ) as FocusSessionRow[]
        )
      } catch (
        loadError
      ) {
        console.error(
          'Failed to load Progress data:',
          loadError
        )

        setError(
          loadError instanceof
            Error
            ? loadError.message
            : 'Your progress data could not be loaded.'
        )
      } finally {
        setLoading(
          false
        )

        setRefreshing(
          false
        )
      }
    }

  useEffect(() => {
    void loadProgressData()
  }, [])

  const now =
    new Date()

  const weekStart =
    useMemo(
      () =>
        startOfWeek(
          now
        ),
      []
    )

  const weekEnd =
    useMemo(
      () =>
        endOfWeek(
          now
        ),
      []
    )

  const weekData =
    useMemo<
      WeekDayData[]
    >(
      () => {
        return Array.from(
          {
            length: 7,
          },
          (
            _,
            index
          ) => {
            const date =
              new Date(
                weekStart
              )

            date.setDate(
              weekStart.getDate() +
                index
            )

            return {
              date,

              key:
                dateKey(
                  date
                ),

              day:
                date.toLocaleDateString(
                  undefined,
                  {
                    weekday:
                      'short',
                  }
                ),

              studyMinutes:
                0,

              tasks:
                0,
            }
          }
        )
      },
      [weekStart]
    )

  const weeklyFocusSessions =
    useMemo(
      () => {
        return focusSessions.filter(
          session => {
            const completedAt =
              parseDate(
                session.completed_at
              )

            if (
              !completedAt
            ) {
              return false
            }

            return (
              completedAt >=
                weekStart &&
              completedAt <
                weekEnd
            )
          }
        )
      },
      [
        focusSessions,
        weekStart,
        weekEnd,
      ]
    )

  const weeklyCompletedTasks =
    useMemo(
      () => {
        return tasks.filter(
          task => {
            if (
              !task.completed ||
              !task.completed_at
            ) {
              return false
            }

            const completedAt =
              parseDate(
                task.completed_at
              )

            if (
              !completedAt
            ) {
              return false
            }

            return (
              completedAt >=
                weekStart &&
              completedAt <
                weekEnd
            )
          }
        )
      },
      [
        tasks,
        weekStart,
        weekEnd,
      ]
    )

  const calculatedWeekData =
    useMemo(
      () => {
        return weekData.map(
          day => {
            const studyMinutes =
              focusSessions.reduce(
                (
                  total,
                  session
                ) => {
                  const completedAt =
                    parseDate(
                      session.completed_at
                    )

                  if (
                    !completedAt ||
                    dateKey(
                      completedAt
                    ) !==
                      day.key
                  ) {
                    return total
                  }

                  return (
                    total +
                    Number(
                      session.duration_minutes ??
                        0
                    )
                  )
                },
                0
              )

            const completedTasks =
              tasks.filter(
                task => {
                  if (
                    !task.completed ||
                    !task.completed_at
                  ) {
                    return false
                  }

                  const completedAt =
                    parseDate(
                      task.completed_at
                    )

                  if (
                    !completedAt
                  ) {
                    return false
                  }

                  return (
                    dateKey(
                      completedAt
                    ) ===
                    day.key
                  )
                }
              ).length

            return {
              ...day,
              studyMinutes,
              tasks:
                completedTasks,
            }
          }
        )
      },
      [
        weekData,
        focusSessions,
        tasks,
      ]
    )

  const weeklyStudyMinutes =
    useMemo(
      () => {
        return weeklyFocusSessions.reduce(
          (
            total,
            session
          ) =>
            total +
            Number(
              session.duration_minutes ??
                0
            ),
          0
        )
      },
      [
        weeklyFocusSessions,
      ]
    )

  const tasksCreatedOrDueThisWeek =
    useMemo(
      () => {
        return tasks.filter(
          task => {
            const dueDate =
              parseDate(
                task.due_date
              )

            if (!dueDate) {
              return false
            }

            return (
              dueDate >=
                weekStart &&
              dueDate <
                weekEnd
            )
          }
        )
      },
      [
        tasks,
        weekStart,
        weekEnd,
      ]
    )

  const completedDueThisWeek =
    useMemo(
      () => {
        return tasksCreatedOrDueThisWeek.filter(
          task =>
            task.completed
        )
      },
      [
        tasksCreatedOrDueThisWeek,
      ]
    )

  const scheduleCompletion =
    useMemo(
      () => {
        if (
          tasksCreatedOrDueThisWeek.length >
          0
        ) {
          return Math.round(
            (
              completedDueThisWeek.length /
              tasksCreatedOrDueThisWeek.length
            ) *
              100
          )
        }

        if (
          tasks.length >
          0
        ) {
          const completed =
            tasks.filter(
              task =>
                task.completed
            ).length

          return Math.round(
            (
              completed /
              tasks.length
            ) *
              100
          )
        }

        return 0
      },
      [
        tasksCreatedOrDueThisWeek,
        completedDueThisWeek,
        tasks,
      ]
    )

  const streak =
    useMemo(
      () =>
        getFocusStreak(
          focusSessions
        ),
      [
        focusSessions,
      ]
    )

  const studyGoalHours =
    profile?.study_hours_per_week &&
    profile.study_hours_per_week >
      0
      ? profile.study_hours_per_week
      : 15

  const currentStudyDisplay =
    formatStudyGoalProgress(
      weeklyStudyMinutes
    )

  const exerciseGoal =
    profile?.exercise_days_per_week &&
    profile.exercise_days_per_week >
      0
      ? profile.exercise_days_per_week
      : 0

  const exerciseDays =
    useMemo(
      () => {
        const exerciseRoutines =
          routines.filter(
            routine =>
              isExerciseRoutine(
                routine.name
              )
          )

        const uniqueDays =
          new Set<string>()

        exerciseRoutines.forEach(
          routine => {
            (
              routine.days ??
              []
            ).forEach(
              day => {
                uniqueDays.add(
                  day
                )
              }
            )
          }
        )

        return uniqueDays.size
      },
      [routines]
    )

  const academicProgress =
    useMemo<
      AcademicProgressItem[]
    >(
      () => {
        const subjectNames =
          new Set<string>()

        subjects.forEach(
          subject => {
            if (
              subject.name.trim()
            ) {
              subjectNames.add(
                subject.name.trim()
              )
            }
          }
        )

        tasks.forEach(
          task => {
            if (
              task.subject?.trim()
            ) {
              subjectNames.add(
                task.subject.trim()
              )
            }
          }
        )

        assessments.forEach(
          assessment => {
            if (
              assessment.subject?.trim()
            ) {
              subjectNames.add(
                assessment.subject.trim()
              )
            }
          }
        )

        return Array.from(
          subjectNames
        ).map(
          (
            subject,
            index
          ) => {
            const subjectRecord =
              subjects.find(
                item =>
                  item.name
                    .trim()
                    .toLowerCase() ===
                  subject
                    .trim()
                    .toLowerCase()
              )

            const subjectAssessments =
              assessments.filter(
                assessment => {
                  if (
                    subjectRecord &&
                    assessment.subject_id
                  ) {
                    return (
                      assessment.subject_id ===
                      subjectRecord.id
                    )
                  }

                  return (
                    assessment.subject
                      ?.trim()
                      .toLowerCase() ===
                    subject
                      .trim()
                      .toLowerCase()
                  )
                }
              )

            let progress = 0

            if (
              subjectAssessments.length >
              0
            ) {
              let totalProgress =
                0

              subjectAssessments.forEach(
                assessment => {
                  const topics =
                    assessmentTopics.filter(
                      topic =>
                        topic.assessment_id ===
                        assessment.id
                    )

                  if (
                    topics.length ===
                    0
                  ) {
                    return
                  }

                  const doneTopics =
                    topics.filter(
                      topic =>
                        topic.done
                    ).length

                  totalProgress +=
                    Math.round(
                      (
                        doneTopics /
                        topics.length
                      ) *
                        100
                    )
                }
              )

              progress =
                Math.round(
                  totalProgress /
                    subjectAssessments.length
                )
            }

            const palette =
              SUBJECT_COLORS[
                index %
                  SUBJECT_COLORS.length
              ]

            return {
              subject,

              progress:
                Math.min(
                  100,
                  Math.max(
                    0,
                    progress
                  )
                ),

              color:
                palette.color,

              dot:
                palette.dot,
            }
          }
        )
      },
      [
        subjects,
        tasks,
        assessments,
        assessmentTopics,
      ]
    )

  const maxStudyMinutes =
    Math.max(
      60,
      ...calculatedWeekData.map(
        day =>
          day.studyMinutes
      )
    )

  const maxTasks =
    Math.max(
      1,
      ...calculatedWeekData.map(
        day =>
          day.tasks
      )
    )

  const todayKey =
    dateKey(
      new Date()
    )

  const studyPercentage =
    studyGoalHours > 0
      ? Math.min(
          100,
          Math.round(
            (
              weeklyStudyMinutes /
              (
                studyGoalHours *
                60
              )
            ) *
              100
          )
        )
      : 0

  const exercisePercentage =
    exerciseGoal > 0
      ? Math.min(
          100,
          Math.round(
            (
              exerciseDays /
              exerciseGoal
            ) *
              100
          )
        )
      : 0

  const stats = [
    {
      icon: Clock,

      label:
        'Study time',

      value:
        formatMinutes(
          weeklyStudyMinutes
        ),

      sub:
        'this week',

      color:
        'text-indigo-600 dark:text-indigo-400',

      bg:
        'bg-indigo-50 dark:bg-indigo-950/40',
    },

    {
      icon:
        CheckSquare,

      label:
        'Tasks completed',

      value:
        String(
          weeklyCompletedTasks.length
        ),

      sub:
        'completed this week',

      color:
        'text-violet-600 dark:text-violet-400',

      bg:
        'bg-violet-50 dark:bg-violet-950/40',
    },

    {
      icon: Target,

      label:
        'Focus sessions',

      value:
        String(
          weeklyFocusSessions.length
        ),

      sub:
        'this week',

      color:
        'text-blue-600 dark:text-blue-400',

      bg:
        'bg-blue-50 dark:bg-blue-950/40',
    },

    {
      icon:
        TrendingUp,

      label:
        'Task completion',

      value:
        `${scheduleCompletion}%`,

      sub:
        tasksCreatedOrDueThisWeek.length >
        0
          ? 'of tasks due this week'
          : 'of all tasks',

      color:
        'text-emerald-600 dark:text-emerald-400',

      bg:
        'bg-emerald-50 dark:bg-emerald-950/40',
    },

    {
      icon: Flame,

      label:
        'Focus streak',

      value:
        `${streak} ${
          streak === 1
            ? 'day'
            : 'days'
        }`,

      sub:
        streak > 0
          ? 'keep it going!'
          : 'start a session today',

      color:
        'text-amber-600 dark:text-amber-400',

      bg:
        'bg-amber-50 dark:bg-amber-950/40',
    },
  ]

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">

        <div className="mb-8">

          <h1 className="font-display font-800 text-2xl text-slate-900 dark:text-white">
            Progress
          </h1>

          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Loading your progress...
          </p>

        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 flex items-center justify-center">

          <RefreshCw
            size={22}
            className="text-indigo-500 animate-spin"
          />

        </div>

      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">

      <div className="mb-8">

        <div className="flex items-start justify-between gap-4">

          <div>

            <h1 className="font-display font-800 text-2xl text-slate-900 dark:text-white">
              Progress
            </h1>

            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              Your real activity and progress for this week.
            </p>

            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400 dark:text-slate-500">

              <Calendar
                size={13}
              />

              <span>
                {formatShortDate(
                  weekStart
                )}{' '}
                –{' '}
                {formatShortDate(
                  new Date(
                    weekEnd.getTime() -
                      24 *
                        60 *
                        60 *
                        1000
                  )
                )}
              </span>

            </div>

          </div>

          <button
            type="button"
            onClick={() =>
              void loadProgressData(
                true
              )
            }
            disabled={
              refreshing
            }
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >

            <RefreshCw
              size={14}
              className={
                refreshing
                  ? 'animate-spin'
                  : ''
              }
            />

            {refreshing
              ? 'Refreshing...'
              : 'Refresh'}

          </button>

        </div>

      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3">

          <AlertCircle
            size={17}
            className="text-red-500 flex-shrink-0 mt-0.5"
          />

          <div>

            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              Progress data could not be loaded
            </p>

            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {error}
            </p>

          </div>

        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">

        {stats.map(
          stat => (
            <div
              key={
                stat.label
              }
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4"
            >

              <div
                className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}
              >

                <stat.icon
                  size={16}
                  className={
                    stat.color
                  }
                />

              </div>

              <div
                className={`font-display font-700 text-xl ${stat.color}`}
              >
                {stat.value}
              </div>

              <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                {stat.label}
              </div>

              <div className="text-xs text-slate-400 dark:text-slate-500">
                {stat.sub}
              </div>

            </div>
          )
        )}

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">

          <h3 className="font-display font-600 text-base text-slate-900 dark:text-white mb-1">
            Weekly Activity
          </h3>

          <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">
            Focus study time and completed tasks.
          </p>

          <div className="flex items-end gap-3 h-44">

            {calculatedWeekData.map(
              day => {
                const studyHeight =
                  day.studyMinutes >
                  0
                    ? Math.max(
                        8,
                        (
                          day.studyMinutes /
                          maxStudyMinutes
                        ) *
                          100
                      )
                    : 0

                const taskHeight =
                  day.tasks > 0
                    ? Math.max(
                        8,
                        (
                          day.tasks /
                          maxTasks
                        ) *
                          100
                      )
                    : 0

                return (
                  <div
                    key={
                      day.key
                    }
                    className="flex-1 flex flex-col items-center gap-2 h-full"
                  >

                    <div className="flex-1 w-full flex items-end gap-0.5">

                      <div
                        className="flex-1 bg-indigo-500 rounded-t-lg transition-all hover:bg-indigo-600"
                        style={{
                          height:
                            `${studyHeight}%`,
                        }}
                        title={`${formatMinutes(
                          day.studyMinutes
                        )} focus study`}
                      />

                      <div
                        className="flex-1 bg-violet-300 dark:bg-violet-700 rounded-t-lg transition-all hover:bg-violet-400"
                        style={{
                          height:
                            `${taskHeight}%`,
                        }}
                        title={`${day.tasks} completed ${
                          day.tasks ===
                          1
                            ? 'task'
                            : 'tasks'
                        }`}
                      />

                    </div>

                    <span
                      className={`text-xs ${
                        day.key ===
                        todayKey
                          ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {day.day}
                    </span>

                  </div>
                )
              }
            )}

          </div>

          <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">

            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">

              <div className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />

              Focus study

            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">

              <div className="w-2.5 h-2.5 rounded-sm bg-violet-300 dark:bg-violet-700" />

              Completed tasks

            </div>

          </div>

          <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500 mt-3">
            Completed task activity uses the actual date the task was marked complete.
          </p>

        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">

          <h3 className="font-display font-600 text-base text-slate-900 dark:text-white mb-1">
            Personal Goals
          </h3>

          <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">
            Compared with the goals from your profile.
          </p>

          <div className="space-y-6">

            <div>

              <div className="flex items-center justify-between gap-4 mb-2">

                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Study hours / week
                </span>

                <span className="text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">

                  <span className="text-indigo-600 dark:text-indigo-400">
                    {currentStudyDisplay}
                  </span>

                  <span className="text-slate-300 dark:text-slate-600">
                    {' / '}
                  </span>

                  {studyGoalHours}h

                </span>

              </div>

              <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">

                <div
                  className="h-2.5 rounded-full bg-indigo-500 transition-all"
                  style={{
                    width:
                      `${studyPercentage}%`,
                  }}
                />

              </div>

              <div className="text-right text-xs text-slate-400 dark:text-slate-500 mt-1">
                {studyPercentage}%
              </div>

            </div>

            <div>

              <div className="flex items-center justify-between gap-4 mb-2">

                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Exercise days / week
                </span>

                <span className="text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">

                  <span className="text-emerald-600 dark:text-emerald-400">
                    {exerciseDays}
                  </span>

                  <span className="text-slate-300 dark:text-slate-600">
                    {' / '}
                  </span>

                  {exerciseGoal} days

                </span>

              </div>

              <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">

                <div
                  className="h-2.5 rounded-full bg-emerald-500 transition-all"
                  style={{
                    width:
                      `${exercisePercentage}%`,
                  }}
                />

              </div>

              <div className="text-right text-xs text-slate-400 dark:text-slate-500 mt-1">

                {exerciseGoal >
                0
                  ? `${exercisePercentage}%`
                  : 'No exercise goal set'}

              </div>

            </div>

            <div>

              <div className="flex items-center justify-between gap-4 mb-2">

                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Focus sessions / week
                </span>

                <span className="text-sm font-semibold text-violet-600 dark:text-violet-400 whitespace-nowrap">

                  {
                    weeklyFocusSessions.length
                  }{' '}

                  {weeklyFocusSessions.length ===
                  1
                    ? 'session'
                    : 'sessions'}

                </span>

              </div>

              <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">

                <div
                  className="h-2.5 rounded-full bg-violet-500 transition-all"
                  style={{
                    width:
                      weeklyFocusSessions.length >
                      0
                        ? '100%'
                        : '0%',
                  }}
                />

              </div>

              <div className="text-right text-xs text-slate-400 dark:text-slate-500 mt-1">

                {
                  weeklyFocusSessions.length
                }{' '}

                {weeklyFocusSessions.length ===
                1
                  ? 'session'
                  : 'sessions'}{' '}

                completed this week

              </div>

            </div>

          </div>

          <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500 mt-5">
            Focus sessions are tracked as activity rather than compared with an automatically generated target.
          </p>

        </div>

      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">

        <div className="flex items-start justify-between gap-4 mb-5">

          <div>

            <h3 className="font-display font-600 text-base text-slate-900 dark:text-white">
              Academic Progress
            </h3>

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Based on your assessment topics stored in My Scheduler.
            </p>

          </div>

        </div>

        {academicProgress.length >
        0 ? (
          <div className="space-y-4">

            {academicProgress.map(
              subject => (
                <div
                  key={
                    subject.subject
                  }
                  className="flex items-center gap-4"
                >

                  <span className="text-sm text-slate-700 dark:text-slate-300 w-36 flex-shrink-0 truncate">
                    {subject.subject}
                  </span>

                  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">

                    <div
                      className={`h-2 rounded-full ${subject.color}`}
                      style={{
                        width:
                          `${subject.progress}%`,
                      }}
                    />

                  </div>

                  <span
                    className={`text-sm font-semibold ${subject.dot} w-10 text-right flex-shrink-0`}
                  >
                    {subject.progress}%
                  </span>

                </div>
              )
            )}

          </div>
        ) : (
          <div className="py-10 text-center">

            <TrendingUp
              size={28}
              className="mx-auto text-slate-300 dark:text-slate-600 mb-3"
            />

            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              No academic progress yet
            </p>

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Add subjects and assessments to start tracking your progress.
            </p>

          </div>
        )}

        {academicProgress.length >
          0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-5 italic">
            A subject&apos;s percentage is calculated from the completion of its assessment topics.
          </p>
        )}

      </div>

    </div>
  )
}