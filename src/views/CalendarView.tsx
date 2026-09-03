import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Clock,
  Lock,
  Shuffle,
  BookOpen,
  CheckSquare,
  X,
  Trash2,
  Pencil,
  GraduationCap,
  MapPin,
  UserRound,
} from 'lucide-react'

import type {
  UserProfile,
  ClassScheduleItem,
  RoutineItem,
  Task,
} from '../types'

import AddEventModal from '../components/AddEventModal'
import type { CalendarCustomEvent } from '../components/AddEventModal'

import { supabase } from '../utils/supabase'

type CalendarMode =
  | 'day'
  | 'week'
  | 'month'

interface CalendarViewProps {
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

interface CalendarEvent {
  id: string
  sourceId?: string
  day?: string
  date?: string
  title: string
  subtitle: string
  startTime?: string
  endTime?: string

  type:
    | 'class'
    | 'routine'
    | 'study'
    | 'task'
    | 'custom'

  color: string
  category?: string
  notes?: string

  venue?: string
  lecturer?: string
}

interface SelectedCalendarEvent {
  event: CalendarEvent
  date: Date
}

interface CalendarColors {
  classes: string
  routines: string
  study: string
  events: string
  tasks: string
}

interface TaskRow {
  id: string
  title: string
  subject: string | null
  due_date: string | null
  duration_minutes: number | null
  priority:
    | 'high'
    | 'medium'
    | 'low'
  completed: boolean
  scheduling_type:
    | 'fixed'
    | 'flexible'
    | null
  scheduled_date: string | null
  scheduled_time: string | null
}

interface ScheduledTask extends Task {
  schedulingType:
    | 'fixed'
    | 'flexible'
  scheduledDate: string
  scheduledTime: string
  durationMinutes: number
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

interface CustomEventRow {
  id: string
  title: string
  description: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  location: string | null
  color: string | null
  completed: boolean
  category: string | null
}

interface ClassRow {
  id: string
  subject_id: string | null
  day: string
  subject: string | null
  start_time: string
  end_time: string
  venue: string | null
  lecturer: string | null
}

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

const SHORT_DAYS = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
]

const HOURS = Array.from(
  { length: 20 },
  (_, index) => index + 4
)

const START_HOUR = 4
const HOUR_HEIGHT = 60

const DEFAULT_CALENDAR_COLORS: CalendarColors = {
  classes: '#6366f1',
  routines: '#10b981',
  study: '#8b5cf6',
  events: '#0ea5e9',
  tasks: '#f59e0b',
}

function loadCalendarColors(): CalendarColors {
  const saved =
    localStorage.getItem(
      'mySchedulerCalendarColors'
    )

  if (!saved) {
    return DEFAULT_CALENDAR_COLORS
  }

  try {
    return {
      ...DEFAULT_CALENDAR_COLORS,
      ...(JSON.parse(
        saved
      ) as Partial<CalendarColors>),
    }
  } catch {
    return DEFAULT_CALENDAR_COLORS
  }
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

  const [hourString, minute] =
    time.split(':')

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

function timeToDecimal(time: string) {
  const [hour, minute] =
    time
      .split(':')
      .map(Number)

  return hour + minute / 60
}

function timeToMinutes(time: string) {
  const [hour, minute] =
    time
      .split(':')
      .map(Number)

  return (
    hour * 60 +
    minute
  )
}

function minutesToTime(minutes: number) {
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

function getMonday(date: Date) {
  const result =
    new Date(date)

  const day =
    result.getDay()

  const difference =
    result.getDate() -
    day +
    (day === 0 ? -6 : 1)

  result.setDate(
    difference
  )

  result.setHours(
    0,
    0,
    0,
    0
  )

  return result
}

function addDays(
  date: Date,
  amount: number
) {
  const next =
    new Date(date)

  next.setDate(
    next.getDate() +
      amount
  )

  return next
}

function isSameDate(
  a: Date,
  b: Date
) {
  return (
    a.getFullYear() ===
      b.getFullYear() &&
    a.getMonth() ===
      b.getMonth() &&
    a.getDate() ===
      b.getDate()
  )
}

function getDateKey(date: Date) {
  const year =
    date.getFullYear()

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, '0')

  const day =
    String(
      date.getDate()
    ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getDayName(dateString: string) {
  const date =
    new Date(
      `${dateString}T00:00:00`
    )

  return new Intl.DateTimeFormat(
    'en-US',
    {
      weekday: 'long',
    }
  ).format(date)
}

function getDateForDayName(
  dayName: string,
  referenceDate: Date
) {
  const monday =
    getMonday(referenceDate)

  const index =
    DAYS.indexOf(dayName)

  const date =
    addDays(
      monday,
      index >= 0
        ? index
        : 0
    )

  return getDateKey(date)
}

function monthTitle(date: Date) {
  return new Intl.DateTimeFormat(
    'en-US',
    {
      month: 'long',
      year: 'numeric',
    }
  ).format(date)
}

function fullDateTitle(date: Date) {
  return new Intl.DateTimeFormat(
    'en-US',
    {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }
  ).format(date)
}

function buildDuration(
  minutes: number | null
) {
  const total =
    minutes ?? 0

  if (total <= 0) {
    return ''
  }

  const hours =
    Math.floor(
      total / 60
    )

  const remaining =
    total % 60

  if (
    hours > 0 &&
    remaining > 0
  ) {
    return `${hours}h ${remaining}m`
  }

  if (hours > 0) {
    return `${hours}h`
  }

  return `${remaining}m`
}

function calculateDaysUntilDue(
  dueDate: string
) {
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
      `${dueDate.slice(0, 10)}T00:00:00`
    )

  return Math.ceil(
    (
      due.getTime() -
      today.getTime()
    ) /
      86400000
  )
}

function createClassEvents(
  classes: ClassScheduleItem[],
  color: string
): CalendarEvent[] {
  return classes.map(
    classItem => ({
      id:
        `class-${classItem.id}`,

      sourceId:
        classItem.id,

      day:
        classItem.day,

      title:
        classItem.subject,

      subtitle:
        'Class',

      startTime:
        classItem.startTime,

      endTime:
        classItem.endTime,

      venue:
        classItem.venue || '',

      lecturer:
        classItem.lecturer || '',

      type:
        'class',

      color,
    })
  )
}

function createRoutineEvents(
  routines: RoutineItem[],
  color: string
): CalendarEvent[] {
  const events:
    CalendarEvent[] = []

  routines
    .filter(
      routine =>
        routine.type ===
        'fixed'
    )
    .forEach(
      routine => {
        routine.days.forEach(
          day => {
            if (
              !routine.startTime ||
              !routine.endTime
            ) {
              return
            }

            events.push({
              id:
                `routine-${routine.id}-${day}`,

              sourceId:
                routine.id,

              day,

              title:
                routine.name,

              subtitle:
                'Fixed routine',

              startTime:
                routine.startTime,

              endTime:
                routine.endTime,

              type:
                'routine',

              color,
            })
          }
        )
      }
    )

  return events
}

export default function CalendarView({
  userProfile,
}: CalendarViewProps) {
  const [mode, setMode] =
    useState<CalendarMode>(
      'week'
    )

  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState(new Date())

  const [
    showAddEvent,
    setShowAddEvent,
  ] =
    useState(false)

  const [
    editingEvent,
    setEditingEvent,
  ] =
    useState<CalendarCustomEvent | null>(
      null
    )

  const [
    selectedEvent,
    setSelectedEvent,
  ] =
    useState<SelectedCalendarEvent | null>(
      null
    )

  const [
    customEventPendingDelete,
    setCustomEventPendingDelete,
  ] =
    useState<SelectedCalendarEvent | null>(
      null
    )

  const [
    classPendingDelete,
    setClassPendingDelete,
  ] =
    useState<SelectedCalendarEvent | null>(
      null
    )

  const [
    studySessionPendingDelete,
    setStudySessionPendingDelete,
  ] =
    useState<SelectedCalendarEvent | null>(
      null
    )

  const [
    editingStudySession,
    setEditingStudySession,
  ] =
    useState<StudyPlanSession | null>(
      null
    )

  const [
    studyDay,
    setStudyDay,
  ] =
    useState('Monday')

  const [
    studyStartTime,
    setStudyStartTime,
  ] =
    useState('18:00')

  const [
    studyEndTime,
    setStudyEndTime,
  ] =
    useState('19:00')

  const [
    studyError,
    setStudyError,
  ] =
    useState('')

  const [
    editingClass,
    setEditingClass,
  ] =
    useState<ClassScheduleItem | null>(
      null
    )

  const [
    classDay,
    setClassDay,
  ] =
    useState('Monday')

  const [
    classSubject,
    setClassSubject,
  ] =
    useState('')

  const [
    classStartTime,
    setClassStartTime,
  ] =
    useState('08:00')

  const [
    classEndTime,
    setClassEndTime,
  ] =
    useState('09:00')

  const [
    classVenue,
    setClassVenue,
  ] =
    useState('')

  const [
    classLecturer,
    setClassLecturer,
  ] =
    useState('')

  const [
    classError,
    setClassError,
  ] =
    useState('')

  const [
    classes,
    setClasses,
  ] =
    useState<ClassScheduleItem[]>(
      []
    )

  const [
    subjectOptions,
    setSubjectOptions,
  ] =
    useState<SubjectRow[]>(
      []
    )

  const [
    tasks,
    setTasks,
  ] =
    useState<ScheduledTask[]>([])

  const [
    studyPlan,
    setStudyPlan,
  ] =
    useState<
      StudyPlanSession[]
    >([])

  const [
    customEvents,
    setCustomEvents,
  ] =
    useState<
      CalendarCustomEvent[]
    >([])

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    loadError,
    setLoadError,
  ] =
    useState('')

  const routines =
    userProfile?.routines ??
    []

  const subjects =
    subjectOptions.map(
      subject =>
        subject.name
    )

  const calendarColors =
    loadCalendarColors()

  const loadCalendarData =
    async () => {
      setLoading(true)
      setLoadError('')

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
            'You are not signed in.'
          )
        }

        const [
          classResult,
          taskResult,
          subjectResult,
          studyResult,
          eventResult,
        ] =
          await Promise.all([
            supabase
              .from('classes')
              .select(
                `
                  id,
                  subject_id,
                  day,
                  subject,
                  start_time,
                  end_time,
                  venue,
                  lecturer
                `
              )
              .eq(
                'user_id',
                user.id
              )
              .order(
                'day',
                {
                  ascending: true,
                }
              ),

            supabase
              .from('tasks')
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
                  ascending: false,
                }
              ),

            supabase
              .from('subjects')
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
                  ascending: true,
                }
              )
              .order(
                'start_time',
                {
                  ascending: true,
                }
              ),

            supabase
              .from(
                'custom_events'
              )
              .select(
                `
                  id,
                  title,
                  description,
                  event_date,
                  start_time,
                  end_time,
                  location,
                  color,
                  completed,
                  category
                `
              )
              .eq(
                'user_id',
                user.id
              )
              .order(
                'event_date',
                {
                  ascending: true,
                }
              )
              .order(
                'start_time',
                {
                  ascending: true,
                }
              ),
          ])

        if (
          classResult.error
        ) {
          throw classResult.error
        }

        if (
          taskResult.error
        ) {
          throw taskResult.error
        }

        if (
          subjectResult.error
        ) {
          throw subjectResult.error
        }

        if (
          studyResult.error
        ) {
          throw studyResult.error
        }

        if (
          eventResult.error
        ) {
          throw eventResult.error
        }

        const loadedSubjects =
          (
            subjectResult.data ??
            []
          ).map(
            row =>
              row as SubjectRow
          )

        setSubjectOptions(
          loadedSubjects
        )

        const subjectMap =
          new Map<
            string,
            string
          >()

        loadedSubjects.forEach(
          item => {
            subjectMap.set(
              item.id,
              item.name
            )
          }
        )

        const loadedClasses =
          (
            classResult.data ??
            []
          ).map(
            row => {
              const item =
                row as ClassRow

              const linkedSubjectName =
                item.subject_id
                  ? subjectMap.get(
                      item.subject_id
                    )
                  : undefined

              return {
                id: item.id,
                day: item.day,
                subject:
                  linkedSubjectName ||
                  item.subject ||
                  'Class',
                startTime:
                  item.start_time?.slice(
                    0,
                    5
                  ) ?? '',
                endTime:
                  item.end_time?.slice(
                    0,
                    5
                  ) ?? '',
                venue:
                  item.venue ||
                  '',
                lecturer:
                  item.lecturer ||
                  '',
              } as ClassScheduleItem
            }
          )

        setClasses(
          loadedClasses
        )

        const loadedTasks =
          (
            taskResult.data ??
            []
          ).map(
            row => {
              const item =
                row as TaskRow

              const dueDate =
                item.due_date
                  ? item.due_date.slice(
                      0,
                      10
                    )
                  : ''

              const schedulingType =
                item.scheduling_type ===
                'fixed'
                  ? 'fixed'
                  : 'flexible'

              const scheduledDate =
                item.scheduled_date
                  ? item.scheduled_date.slice(
                      0,
                      10
                    )
                  : ''

              const scheduledTime =
                item.scheduled_time
                  ? item.scheduled_time.slice(
                      0,
                      5
                    )
                  : ''

              const durationMinutes =
                Math.max(
                  0,
                  Number(
                    item.duration_minutes ??
                      0
                  )
                )

              return {
                id:
                  item.id,

                title:
                  item.title,

                subject:
                  item.subject ||
                  'Personal',

                dueDate,

                daysUntilDue:
                  dueDate
                    ? calculateDaysUntilDue(
                        dueDate
                      )
                    : 0,

                duration:
                  buildDuration(
                    item.duration_minutes
                  ),

                priority:
                  item.priority,

                completed:
                  item.completed,

                schedulingType,

                scheduledDate,

                scheduledTime,

                durationMinutes,
              } as ScheduledTask
            }
          )

        setTasks(
          loadedTasks
        )

        const loadedStudyPlan =
          (
            studyResult.data ??
            []
          ).map(
            row => {
              const item =
                row as StudyPlanRow

              const subject =
                item.subject_id
                  ? subjectMap.get(
                      item.subject_id
                    ) ||
                    item.title.replace(
                      /^Study\s+/i,
                      ''
                    )
                  : item.title.replace(
                      /^Study\s+/i,
                      ''
                    )

              return {
                id:
                  item.id,

                day:
                  getDayName(
                    item.scheduled_date
                  ),

                scheduledDate:
                  item.scheduled_date,

                subject,

                startTime:
                  item.start_time?.slice(
                    0,
                    5
                  ) ?? '',

                endTime:
                  item.end_time?.slice(
                    0,
                    5
                  ) ?? '',

                durationMinutes:
                  item.duration_minutes ??
                  0,

                reason:
                  item.notes ||
                  'Study session',
              } as StudyPlanSession
            }
          )

        setStudyPlan(
          loadedStudyPlan
        )

        const loadedEvents =
          (
            eventResult.data ??
            []
          ).map(
            row => {
              const item =
                row as CustomEventRow

              return {
                id:
                  item.id,

                title:
                  item.title,

                date:
                  item.event_date,

                startTime:
                  item.start_time?.slice(
                    0,
                    5
                  ) ?? '',

                endTime:
                  item.end_time?.slice(
                    0,
                    5
                  ) ?? '',

                category:
                  item.category ||
                  'Personal',

                notes:
                  item.description ||
                  '',

                location:
                  item.location ||
                  '',

                color:
                  item.color,

                completed:
                  item.completed,
              } as CalendarCustomEvent
            }
          )

        setCustomEvents(
          loadedEvents
        )
      } catch (error) {
        console.error(
          'Failed to load calendar data:',
          error
        )

        setLoadError(
          error instanceof Error
            ? error.message
            : 'Calendar data could not be loaded.'
        )
      } finally {
        setLoading(false)
      }
    }

  useEffect(() => {
    void loadCalendarData()
  }, [])

  const recurringEvents =
    useMemo(() => {
      return [
        ...createClassEvents(
          classes,
          calendarColors.classes
        ),

        ...createRoutineEvents(
          routines,
          calendarColors.routines
        ),
      ]
    }, [
      classes,
      routines,
      calendarColors.classes,
      calendarColors.routines,
    ])

  const studyCalendarEvents =
    useMemo(() => {
      return studyPlan.map(
        session =>
          ({
            id:
              `study-${session.id}`,

            sourceId:
              session.id,

            date:
              session.scheduledDate,

            title:
              `Study ${session.subject}`,

            subtitle:
              session.reason ||
              'Study session',

            startTime:
              session.startTime,

            endTime:
              session.endTime,

            type:
              'study',

            color:
              calendarColors.study,
          } as CalendarEvent)
      )
    }, [
      studyPlan,
      calendarColors.study,
    ])

  const fixedTaskCalendarEvents =
    useMemo(() => {
      return tasks
        .filter(
          task =>
            task.schedulingType ===
              'fixed' &&
            task.scheduledDate &&
            task.scheduledTime
        )
        .map(
          task => {
            const startMinutes =
              timeToMinutes(
                task.scheduledTime
              )

            const durationMinutes =
              Math.max(
                task.durationMinutes,
                15
              )

            return {
              id:
                `task-fixed-${task.id}`,

              sourceId:
                task.id,

              date:
                task.scheduledDate,

              title:
                task.title,

              subtitle:
                task.completed
                  ? 'Completed fixed task'
                  : `${task.subject || 'Task'} · ${task.duration}`,

              startTime:
                task.scheduledTime,

              endTime:
                minutesToTime(
                  startMinutes +
                    durationMinutes
                ),

              type:
                'task',

              color:
                task.completed
                  ? '#94a3b8'
                  : calendarColors.tasks,

              notes:
                task.completed
                  ? 'This fixed task has been completed.'
                  : `Fixed task scheduled for ${formatTime(
                      task.scheduledTime
                    )}.`,
            } as CalendarEvent
          }
        )
    }, [
      tasks,
      calendarColors.tasks,
    ])

  const taskEvents =
    useMemo(() => {
      return tasks
        .filter(
          task =>
            task.schedulingType ===
              'flexible' &&
            task.dueDate
        )
        .map(
          task =>
            ({
              id:
                `task-${task.id}`,

              sourceId:
                task.id,

              date:
                task.dueDate.slice(
                  0,
                  10
                ),

              title:
                task.title,

              subtitle:
                task.completed
                  ? 'Completed task'
                  : `${task.subject || 'Task'} · ${task.duration}`,

              type:
                'task',

              color:
                task.completed
                  ? '#94a3b8'
                  : calendarColors.tasks,
            } as CalendarEvent)
        )
    }, [
      tasks,
      calendarColors.tasks,
    ])

  const customCalendarEvents =
    useMemo(() => {
      return customEvents.map(
        event =>
          ({
            id:
              `custom-${event.id}`,

            sourceId:
              event.id,

            date:
              event.date,

            title:
              event.title,

            subtitle:
              event.category,

            startTime:
              event.startTime,

            endTime:
              event.endTime,

            type:
              'custom',

            color:
              event.color ||
              calendarColors.events,

            category:
              event.category,

            notes:
              event.notes,
          } as CalendarEvent)
      )
    }, [
      customEvents,
      calendarColors.events,
    ])

  const flexibleRoutines =
    routines.filter(
      routine =>
        routine.type ===
        'flexible'
    )

  const weekStart =
    getMonday(
      selectedDate
    )

  const weekDates =
    DAYS.map(
      (_, index) =>
        addDays(
          weekStart,
          index
        )
    )

  const selectedDayName =
    new Intl.DateTimeFormat(
      'en-US',
      {
        weekday: 'long',
      }
    ).format(
      selectedDate
    )

  const selectedDateKey =
    getDateKey(
      selectedDate
    )

  const selectedTimedEvents =
    [
      ...recurringEvents.filter(
        event =>
          event.day ===
          selectedDayName
      ),

      ...studyCalendarEvents.filter(
        event =>
          event.date ===
          selectedDateKey
      ),

      ...fixedTaskCalendarEvents.filter(
        event =>
          event.date ===
          selectedDateKey
      ),

      ...customCalendarEvents.filter(
        event =>
          event.date ===
          selectedDateKey
      ),
    ].sort(
      (a, b) =>
        (
          a.startTime ??
          ''
        ).localeCompare(
          b.startTime ??
            ''
        )
    )

  const selectedTaskEvents =
    taskEvents.filter(
      event =>
        event.date ===
        selectedDateKey
    )

  const openEventDetails = (
    event: CalendarEvent,
    date: Date
  ) => {
    setSelectedEvent({
      event,
      date,
    })
  }

  const openNewEvent = () => {
    setEditingEvent(null)
    setShowAddEvent(true)
  }

  const openEditEvent = () => {
    if (
      !selectedEvent ||
      selectedEvent.event.type !==
        'custom' ||
      !selectedEvent.event.sourceId
    ) {
      return
    }

    const original =
      customEvents.find(
        event =>
          event.id ===
          selectedEvent.event.sourceId
      )

    if (!original) {
      return
    }

    setEditingEvent(
      original
    )

    setSelectedEvent(
      null
    )

    setShowAddEvent(
      true
    )
  }

  const closeEventEditor =
    () => {
      setShowAddEvent(false)
      setEditingEvent(null)
    }

  const refreshEvents =
    () => {
      void loadCalendarData()
    }

  const requestDeleteCustomEvent =
    () => {
      if (
        !selectedEvent ||
        selectedEvent.event.type !==
          'custom'
      ) {
        return
      }

      setCustomEventPendingDelete(
        selectedEvent
      )

      setSelectedEvent(
        null
      )
    }

  const deleteCustomEvent =
    async () => {
      if (
        !customEventPendingDelete?.event.sourceId
      ) {
        return
      }

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
            'You are not signed in.'
          )
        }

        const eventId =
          customEventPendingDelete.event.sourceId

        const {
          error,
        } =
          await supabase
            .from(
              'custom_events'
            )
            .delete()
            .eq(
              'id',
              eventId
            )
            .eq(
              'user_id',
              user.id
            )

        if (error) {
          throw error
        }

        const updated =
          customEvents.filter(
            event =>
              event.id !==
              eventId
          )

        setCustomEvents(
          updated
        )

        setCustomEventPendingDelete(
          null
        )
      } catch (error) {
        console.error(
          'Failed to delete custom event:',
          error
        )
      }
    }

  const requestDeleteClass =
    () => {
      if (
        !selectedEvent ||
        selectedEvent.event.type !==
          'class'
      ) {
        return
      }

      setClassPendingDelete(
        selectedEvent
      )

      setSelectedEvent(
        null
      )
    }

  const deleteClass =
    async () => {
      if (
        !classPendingDelete?.event.sourceId
      ) {
        return
      }

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
            'You are not signed in.'
          )
        }

        const classId =
          classPendingDelete.event.sourceId

        const {
          error,
        } =
          await supabase
            .from('classes')
            .delete()
            .eq(
              'id',
              classId
            )
            .eq(
              'user_id',
              user.id
            )

        if (error) {
          throw error
        }

        const updatedClasses =
          classes.filter(
            item =>
              item.id !==
              classId
          )

        setClasses(
          updatedClasses
        )

        if (userProfile) {
          const updatedProfile:
            UserProfile = {
            ...userProfile,
            classes:
              updatedClasses,
          }

          localStorage.setItem(
            'mySchedulerProfile',
            JSON.stringify(
              updatedProfile
            )
          )
        }

        setClassPendingDelete(
          null
        )
      } catch (error) {
        console.error(
          'Failed to delete class:',
          error
        )
      }
    }

  const requestDeleteStudySession =
    () => {
      if (
        !selectedEvent ||
        selectedEvent.event.type !==
          'study'
      ) {
        return
      }

      setStudySessionPendingDelete(
        selectedEvent
      )

      setSelectedEvent(
        null
      )
    }

  const deleteStudySession =
    async () => {
      if (
        !studySessionPendingDelete?.event.sourceId
      ) {
        return
      }

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
            'You are not signed in.'
          )
        }

        const sessionId =
          studySessionPendingDelete.event.sourceId

        const {
          error,
        } =
          await supabase
            .from(
              'study_plans'
            )
            .delete()
            .eq(
              'id',
              sessionId
            )
            .eq(
              'user_id',
              user.id
            )

        if (error) {
          throw error
        }

        const updated =
          studyPlan.filter(
            session =>
              session.id !==
              sessionId
          )

        setStudyPlan(
          updated
        )

        setStudySessionPendingDelete(
          null
        )
      } catch (error) {
        console.error(
          'Failed to delete study session:',
          error
        )
      }
    }

  const openEditStudySession =
    () => {
      if (
        !selectedEvent ||
        selectedEvent.event.type !==
          'study' ||
        !selectedEvent.event.sourceId
      ) {
        return
      }

      const original =
        studyPlan.find(
          session =>
            session.id ===
            selectedEvent.event.sourceId
        )

      if (!original) {
        return
      }

      setEditingStudySession(
        original
      )

      setStudyDay(
        original.day
      )

      setStudyStartTime(
        original.startTime
      )

      setStudyEndTime(
        original.endTime
      )

      setStudyError('')

      setSelectedEvent(
        null
      )
    }

  const saveStudySessionChanges =
    async () => {
      if (!editingStudySession) {
        return
      }

      if (
        !studyStartTime ||
        !studyEndTime
      ) {
        setStudyError(
          'Please choose a start and end time.'
        )
        return
      }

      if (
        studyEndTime <=
        studyStartTime
      ) {
        setStudyError(
          'The end time must be later than the start time.'
        )
        return
      }

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
            'You are not signed in.'
          )
        }

        const durationMinutes =
          Math.round(
            (
              timeToDecimal(
                studyEndTime
              ) -
              timeToDecimal(
                studyStartTime
              )
            ) * 60
          )

        const originalDate =
          new Date(
            `${editingStudySession.scheduledDate}T00:00:00`
          )

        const scheduledDate =
          getDateForDayName(
            studyDay,
            originalDate
          )

        const {
          error,
        } =
          await supabase
            .from(
              'study_plans'
            )
            .update({
              scheduled_date:
                scheduledDate,

              start_time:
                studyStartTime,

              end_time:
                studyEndTime,

              duration_minutes:
                durationMinutes,
            })
            .eq(
              'id',
              editingStudySession.id
            )
            .eq(
              'user_id',
              user.id
            )

        if (error) {
          throw error
        }

        const updated =
          studyPlan.map(
            session =>
              session.id ===
              editingStudySession.id
                ? {
                    ...session,

                    day:
                      studyDay,

                    scheduledDate,

                    startTime:
                      studyStartTime,

                    endTime:
                      studyEndTime,

                    durationMinutes,
                  }
                : session
          )

        setStudyPlan(
          updated
        )

        setEditingStudySession(
          null
        )

        setStudyError('')
      } catch (error) {
        console.error(
          'Failed to reschedule study session:',
          error
        )

        setStudyError(
          error instanceof Error
            ? error.message
            : 'The study session could not be updated.'
        )
      }
    }

  const openEditClass = () => {
    if (
      !selectedEvent ||
      selectedEvent.event.type !==
        'class' ||
      !selectedEvent.event.sourceId
    ) {
      return
    }

    const originalClass =
      classes.find(
        classItem =>
          classItem.id ===
          selectedEvent.event.sourceId
      )

    if (!originalClass) {
      return
    }

    setEditingClass(
      originalClass
    )

    setClassDay(
      originalClass.day
    )

    setClassSubject(
      originalClass.subject
    )

    setClassStartTime(
      originalClass.startTime
    )

    setClassEndTime(
      originalClass.endTime
    )

    setClassVenue(
      originalClass.venue ||
        ''
    )

    setClassLecturer(
      originalClass.lecturer ||
        ''
    )

    setClassError('')

    setSelectedEvent(
      null
    )
  }

  const saveClassChanges =
    async () => {
      if (!editingClass) {
        return
      }

      if (!classSubject) {
        setClassError(
          'Please select a subject.'
        )
        return
      }

      if (
        !classStartTime ||
        !classEndTime
      ) {
        setClassError(
          'Please choose a start and end time.'
        )
        return
      }

      if (
        classEndTime <=
        classStartTime
      ) {
        setClassError(
          'The end time must be later than the start time.'
        )
        return
      }

      if (
        !classVenue.trim()
      ) {
        setClassError(
          'Please enter where the class is held.'
        )
        return
      }

      if (
        !classLecturer.trim()
      ) {
        setClassError(
          'Please enter the lecturer.'
        )
        return
      }

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
            'You are not signed in.'
          )
        }

        const selectedSubject =
          subjectOptions.find(
            subject =>
              subject.name
                .trim()
                .toLowerCase() ===
              classSubject
                .trim()
                .toLowerCase()
          )

        if (!selectedSubject) {
          setClassError(
            'This subject could not be matched to your saved subjects. Please select a subject from the list.'
          )
          return
        }

        const {
          error,
        } =
          await supabase
            .from('classes')
            .update({
              day:
                classDay,

              subject_id:
                selectedSubject.id,

              subject:
                selectedSubject.name,

              start_time:
                classStartTime,

              end_time:
                classEndTime,

              venue:
                classVenue.trim(),

              lecturer:
                classLecturer.trim(),
            })
            .eq(
              'id',
              editingClass.id
            )
            .eq(
              'user_id',
              user.id
            )

        if (error) {
          throw error
        }

        const updatedClasses =
          classes.map(
            classItem =>
              classItem.id ===
              editingClass.id
                ? {
                    ...classItem,

                    day:
                      classDay,

                    subject:
                      selectedSubject.name,

                    startTime:
                      classStartTime,

                    endTime:
                      classEndTime,

                    venue:
                      classVenue.trim(),

                    lecturer:
                      classLecturer.trim(),
                  }
                : classItem
          )

        setClasses(
          updatedClasses
        )

        if (userProfile) {
          const updatedProfile:
            UserProfile = {
            ...userProfile,
            classes:
              updatedClasses,
          }

          localStorage.setItem(
            'mySchedulerProfile',
            JSON.stringify(
              updatedProfile
            )
          )
        }

        setEditingClass(
          null
        )

        setClassError('')
      } catch (error) {
        console.error(
          'Failed to update class:',
          error
        )

        setClassError(
          error instanceof Error
            ? error.message
            : 'The class could not be updated.'
        )
      }
    }

  const goPrevious = () => {
    const next =
      new Date(
        selectedDate
      )

    if (mode === 'day') {
      next.setDate(
        next.getDate() -
          1
      )
    }

    if (mode === 'week') {
      next.setDate(
        next.getDate() -
          7
      )
    }

    if (mode === 'month') {
      next.setMonth(
        next.getMonth() -
          1
      )
    }

    setSelectedDate(next)
  }

  const goNext = () => {
    const next =
      new Date(
        selectedDate
      )

    if (mode === 'day') {
      next.setDate(
        next.getDate() +
          1
      )
    }

    if (mode === 'week') {
      next.setDate(
        next.getDate() +
          7
      )
    }

    if (mode === 'month') {
      next.setMonth(
        next.getMonth() +
          1
      )
    }

    setSelectedDate(next)
  }

  const goToday = () => {
    setSelectedDate(
      new Date()
    )
  }

  const headerTitle =
    mode === 'day'
      ? fullDateTitle(
          selectedDate
        )
      : monthTitle(
          selectedDate
        )

  const renderEvent = (
    event: CalendarEvent,
    eventDate: Date,
    compact = false
  ) => {
    if (
      !event.startTime ||
      !event.endTime
    ) {
      return null
    }

    const startDecimal =
      timeToDecimal(
        event.startTime
      )

    let endDecimal =
      timeToDecimal(
        event.endTime
      )

    if (
      endDecimal <
      startDecimal
    ) {
      endDecimal += 24
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

    const icon =
      event.type ===
      'class' ? (
        <Lock
          size={9}
          className="text-white/80 flex-shrink-0"
        />
      ) : event.type ===
        'study' ? (
        <BookOpen
          size={9}
          className="text-white/80 flex-shrink-0"
        />
      ) : event.type ===
        'task' ? (
        <CheckSquare
          size={9}
          className="text-white/80 flex-shrink-0"
        />
      ) : (
        <CalendarDays
          size={9}
          className="text-white/80 flex-shrink-0"
        />
      )

    return (
      <button
        type="button"
        key={event.id}
        onClick={eventClick => {
          eventClick.stopPropagation()

          openEventDetails(
            event,
            eventDate
          )
        }}
        className="absolute left-1 right-1 rounded-lg px-2 py-1.5 overflow-hidden hover:brightness-95 transition-all cursor-pointer text-left"
        style={{
          backgroundColor:
            event.color,

          top:
            Math.max(
              top,
              0
            ) + 1,

          height:
            Math.max(
              height - 2,
              26
            ),
        }}
      >
        <div className="flex items-center gap-1">
          {icon}

          <p className="text-white text-xs font-semibold truncate">
            {event.title}
          </p>
        </div>

        {!compact &&
          height > 38 && (
            <>
              <p className="text-white/75 text-xs mt-0.5 truncate">
                {formatTime(
                  event.startTime
                )}{' '}
                –{' '}
                {formatTime(
                  event.endTime
                )}
              </p>

              {event.type ===
                'class' &&
                event.venue &&
                height > 60 && (
                  <p className="text-white/70 text-xs truncate mt-0.5">
                    {event.venue}
                  </p>
                )}
            </>
          )}
      </button>
    )
  }

  const monthFirstDay =
    new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      1
    )

  const monthLastDay =
    new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth() +
        1,
      0
    )

  const mondayIndex =
    (
      monthFirstDay.getDay() +
      6
    ) %
    7

  const monthCells:
    (Date | null)[] =
    []

  for (
    let index = 0;
    index <
    mondayIndex;
    index++
  ) {
    monthCells.push(null)
  }

  for (
    let dateNumber = 1;
    dateNumber <=
    monthLastDay.getDate();
    dateNumber++
  ) {
    monthCells.push(
      new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        dateNumber
      )
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 lg:px-8 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display font-800 text-2xl text-slate-900 dark:text-white">
              Calendar
            </h1>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={
                  goPrevious
                }
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              >
                <ChevronLeft
                  size={16}
                />
              </button>

              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-40 text-center">
                {headerTitle}
              </span>

              <button
                type="button"
                onClick={
                  goNext
                }
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              >
                <ChevronRight
                  size={16}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={
                goToday
              }
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-0.5">
              {(
                [
                  'day',
                  'week',
                  'month',
                ] as CalendarMode[]
              ).map(
                currentMode => (
                  <button
                    type="button"
                    key={currentMode}
                    onClick={() =>
                      setMode(
                        currentMode
                      )
                    }
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                      mode ===
                      currentMode
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    {currentMode}
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              onClick={
                openNewEvent
              }
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              <Plus
                size={14}
              />
              Add Event
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor:
                  calendarColors.classes,
              }}
            />
            Classes
          </span>

          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor:
                  calendarColors.routines,
              }}
            />
            Fixed routines
          </span>

          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor:
                  calendarColors.study,
              }}
            />
            Study plan
          </span>

          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor:
                  calendarColors.events,
              }}
            />
            Events
          </span>

          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor:
                  calendarColors.tasks,
              }}
            />
            Tasks
          </span>

          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Shuffle size={11} />
            {flexibleRoutines.length}{' '}
            flexible{' '}
            {flexibleRoutines.length ===
            1
              ? 'routine'
              : 'routines'}
          </span>
        </div>

        {loadError && (
          <div className="mt-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2">
            <p className="text-xs text-red-600 dark:text-red-400">
              {loadError}
            </p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-8 text-center text-sm text-slate-400">
            Loading calendar...
          </div>
        )}

        {!loading &&
          mode === 'week' && (
          <div className="flex flex-col min-h-full">
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div className="w-16 flex-shrink-0" />

              {weekDates.map(
                (
                  date,
                  index
                ) => {
                  const today =
                    isSameDate(
                      date,
                      new Date()
                    )

                  const dateKey =
                    getDateKey(
                      date
                    )

                  const dueTasks =
                    taskEvents.filter(
                      event =>
                        event.date ===
                        dateKey
                    )

                  return (
                    <button
                      type="button"
                      key={
                        date.toISOString()
                      }
                      onClick={() => {
                        setSelectedDate(
                          date
                        )

                        setMode(
                          'day'
                        )
                      }}
                      className="flex-1 text-center py-3 border-l border-slate-100 dark:border-slate-800 relative"
                    >
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-1">
                        {SHORT_DAYS[index]}
                      </p>

                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto text-sm font-semibold ${
                          today
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {date.getDate()}
                      </div>

                      {dueTasks.length >
                        0 && (
                        <div className="flex justify-center mt-1">
                          <span className="text-xs bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-full px-1.5 py-0.5">
                            {dueTasks.length}{' '}
                            due
                          </span>
                        </div>
                      )}
                    </button>
                  )
                }
              )}
            </div>

            <div className="flex flex-1 relative">
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

              {DAYS.map(
                (
                  day,
                  dayIndex
                ) => {
                  const date =
                    weekDates[
                      dayIndex
                    ]

                  const dateKey =
                    getDateKey(
                      date
                    )

                  const today =
                    isSameDate(
                      date,
                      new Date()
                    )

                  const events = [
                    ...recurringEvents.filter(
                      event =>
                        event.day ===
                        day
                    ),

                    ...studyCalendarEvents.filter(
                      event =>
                        event.date ===
                        dateKey
                    ),

                    ...fixedTaskCalendarEvents.filter(
                      event =>
                        event.date ===
                        dateKey
                    ),

                    ...customCalendarEvents.filter(
                      event =>
                        event.date ===
                        dateKey
                    ),
                  ].sort(
                    (
                      a,
                      b
                    ) =>
                      (
                        a.startTime ??
                        ''
                      ).localeCompare(
                        b.startTime ??
                          ''
                      )
                  )

                  return (
                    <div
                      key={day}
                      className={`flex-1 border-l border-slate-100 dark:border-slate-800 relative ${
                        today
                          ? 'bg-indigo-50/20 dark:bg-indigo-950/10'
                          : ''
                      }`}
                    >
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

                      {events.map(
                        event =>
                          renderEvent(
                            event,
                            date,
                            true
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
                  )
                }
              )}
            </div>
          </div>
        )}

        {!loading &&
          mode === 'day' && (
          <div className="p-6">
            <div className="mb-5">
              <h2 className="font-display font-700 text-xl text-slate-900 dark:text-white">
                {fullDateTitle(
                  selectedDate
                )}
              </h2>

              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {selectedTimedEvents.length}{' '}
                timed{' '}
                {selectedTimedEvents.length ===
                1
                  ? 'item'
                  : 'items'}

                {' · '}

                {selectedTaskEvents.length}{' '}

                {selectedTaskEvents.length ===
                1
                  ? 'task due'
                  : 'tasks due'}
              </p>
            </div>

            {selectedTaskEvents.length >
              0 && (
              <div className="mb-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckSquare
                    size={15}
                    className="text-amber-600 dark:text-amber-400"
                  />

                  <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Tasks due
                  </h3>
                </div>

                <div className="space-y-2">
                  {selectedTaskEvents.map(
                    event => (
                      <button
                        type="button"
                        key={event.id}
                        onClick={() =>
                          openEventDetails(
                            event,
                            selectedDate
                          )
                        }
                        className="w-full text-left bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900 rounded-xl px-3 py-2.5 hover:shadow-sm"
                      >
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {event.title}
                        </p>

                        <p className="text-xs text-slate-400 mt-0.5">
                          {event.subtitle}
                        </p>
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            <div className="flex">
              <div className="w-16 flex-shrink-0 relative">
                {HOURS.map(
                  hour => (
                    <div
                      key={hour}
                      className="absolute w-full flex justify-end pr-3"
                      style={{
                        top:
                          (
                            hour -
                            START_HOUR
                          ) *
                          HOUR_HEIGHT,
                      }}
                    >
                      <span className="font-mono text-xs text-slate-400 pt-0.5">
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

              <div className="flex-1 border-l border-slate-200 dark:border-slate-800 relative">
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

                {selectedTimedEvents.map(
                  event =>
                    renderEvent(
                      event,
                      selectedDate
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
            </div>
          </div>
        )}

        {!loading &&
          mode === 'month' && (
          <div className="p-6">
            <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden">
              {SHORT_DAYS.map(
                day => (
                  <div
                    key={day}
                    className="bg-white dark:bg-slate-900 text-center py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400"
                  >
                    {day}
                  </div>
                )
              )}

              {monthCells.map(
                (
                  date,
                  index
                ) => {
                  if (!date) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="bg-white dark:bg-slate-900 min-h-28"
                      />
                    )
                  }

                  const dayName =
                    new Intl.DateTimeFormat(
                      'en-US',
                      {
                        weekday:
                          'long',
                      }
                    ).format(
                      date
                    )

                  const dateKey =
                    getDateKey(
                      date
                    )

                  const recurringForDay =
                    recurringEvents.filter(
                      event =>
                        event.day ===
                        dayName
                    )

                  const studyForDate =
                    studyCalendarEvents.filter(
                      event =>
                        event.date ===
                        dateKey
                    )

                  const tasksForDate =
                    taskEvents.filter(
                      event =>
                        event.date ===
                        dateKey
                    )

                  const fixedTasksForDate =
                    fixedTaskCalendarEvents.filter(
                      event =>
                        event.date ===
                        dateKey
                    )

                  const customForDate =
                    customCalendarEvents.filter(
                      event =>
                        event.date ===
                        dateKey
                    )

                  const events = [
                    ...recurringForDay,
                    ...studyForDate,
                    ...fixedTasksForDate,
                    ...customForDate,
                    ...tasksForDate,
                  ]

                  const today =
                    isSameDate(
                      date,
                      new Date()
                    )

                  return (
                    <div
                      key={
                        date.toISOString()
                      }
                      onClick={() => {
                        setSelectedDate(
                          date
                        )

                        setMode(
                          'day'
                        )
                      }}
                      className="bg-white dark:bg-slate-900 min-h-28 p-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <span
                        className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                          today
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {date.getDate()}
                      </span>

                      <div className="mt-1 space-y-1">
                        {events
                          .slice(
                            0,
                            4
                          )
                          .map(
                            event => (
                              <button
                                type="button"
                                key={`${date.toISOString()}-${event.id}`}
                                onClick={click => {
                                  click.stopPropagation()

                                  openEventDetails(
                                    event,
                                    date
                                  )
                                }}
                                className="block w-full text-left text-white text-xs px-1.5 py-0.5 rounded truncate"
                                style={{
                                  backgroundColor:
                                    event.color,
                                }}
                              >
                                {event.title}
                              </button>
                            )
                          )}

                        {events.length >
                          4 && (
                          <p className="text-xs text-slate-400">
                            +
                            {events.length -
                              4}{' '}
                            more
                          </p>
                        )}
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          </div>
        )}
      </div>

      {showAddEvent && (
        <AddEventModal
          defaultDate={
            getDateKey(
              selectedDate
            )
          }
          eventToEdit={
            editingEvent
          }
          onClose={
            closeEventEditor
          }
          onEventAdded={
            refreshEvents
          }
          onEventUpdated={
            refreshEvents
          }
        />
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() =>
              setSelectedEvent(
                null
              )
            }
          />

          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        selectedEvent.event.color,
                    }}
                  />

                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {selectedEvent.event.type ===
                    'custom'
                      ? selectedEvent.event.category ||
                        'Event'
                      : selectedEvent.event.type}
                  </span>
                </div>

                <h2 className="font-display font-700 text-xl text-slate-900 dark:text-white">
                  {selectedEvent.event.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedEvent(
                    null
                  )
                }
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={16} />
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
                    Date
                  </p>

                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {fullDateTitle(
                      selectedEvent.date
                    )}
                  </p>
                </div>
              </div>

              {selectedEvent.event.startTime &&
                selectedEvent.event.endTime && (
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
                          selectedEvent.event.startTime
                        )}{' '}
                        –{' '}
                        {formatTime(
                          selectedEvent.event.endTime
                        )}
                      </p>
                    </div>
                  </div>
                )}

              {selectedEvent.event.type ===
                'class' && (
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
                      {selectedEvent.event.venue?.trim() ||
                        'Venue not set'}
                    </p>
                  </div>
                </div>
              )}

              {selectedEvent.event.type ===
                'class' && (
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
                      {selectedEvent.event.lecturer?.trim() ||
                        'Lecturer not set'}
                    </p>
                  </div>
                </div>
              )}

              {selectedEvent.event.type !==
                'class' && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                    Details
                  </p>

                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {selectedEvent.event.notes ||
                      selectedEvent.event.subtitle ||
                      'No additional details.'}
                  </p>
                </div>
              )}

              {selectedEvent.event.type ===
                'class' && (
                <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-xl px-4 py-3">
                  <p className="text-xs text-indigo-700 dark:text-indigo-300">
                    This is a recurring class from your academic timetable. Editing it changes every weekly occurrence of this class.
                  </p>
                </div>
              )}

              {selectedEvent.event.type ===
                'study' && (
                <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900 rounded-xl px-4 py-3">
                  <p className="text-xs text-violet-700 dark:text-violet-300">
                    This study session was generated by your Study Planner.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-6">
              {selectedEvent.event.type ===
                'class' && (
                <>
                  <button
                    type="button"
                    onClick={
                      openEditClass
                    }
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-sm font-medium"
                  >
                    <GraduationCap
                      size={14}
                    />
                    Edit Class
                  </button>

                  <button
                    type="button"
                    onClick={
                      requestDeleteClass
                    }
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium"
                  >
                    <Trash2
                      size={14}
                    />
                    Delete Class
                  </button>
                </>
              )}

              {selectedEvent.event.type ===
                'study' && (
                <>
                  <button
                    type="button"
                    onClick={
                      openEditStudySession
                    }
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 text-sm font-medium"
                  >
                    <Pencil
                      size={14}
                    />
                    Reschedule
                  </button>

                  <button
                    type="button"
                    onClick={
                      requestDeleteStudySession
                    }
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium"
                  >
                    <Trash2
                      size={14}
                    />
                    Remove Session
                  </button>
                </>
              )}

              {selectedEvent.event.type ===
                'custom' && (
                <>
                  <button
                    type="button"
                    onClick={
                      openEditEvent
                    }
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-sm font-medium"
                  >
                    <Pencil
                      size={14}
                    />
                    Edit Event
                  </button>

                  <button
                    type="button"
                    onClick={
                      requestDeleteCustomEvent
                    }
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium"
                  >
                    <Trash2
                      size={14}
                    />
                    Delete
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() =>
                  setSelectedEvent(
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

      {customEventPendingDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() =>
              setCustomEventPendingDelete(
                null
              )
            }
          />

          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-4">
              <Trash2
                size={20}
                className="text-red-600 dark:text-red-400"
              />
            </div>

            <h2 className="font-display font-700 text-xl text-slate-900 dark:text-white">
              Delete event?
            </h2>

            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                “{customEventPendingDelete.event.title}”
              </span>
              ? This action cannot be undone.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() =>
                  setCustomEventPendingDelete(
                    null
                  )
                }
                className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  deleteCustomEvent
                }
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-xl"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}

      {classPendingDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() =>
              setClassPendingDelete(
                null
              )
            }
          />

          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-4">
              <Trash2
                size={20}
                className="text-red-600 dark:text-red-400"
              />
            </div>

            <h2 className="font-display font-700 text-xl text-slate-900 dark:text-white">
              Delete recurring class?
            </h2>

            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Deleting{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                “{classPendingDelete.event.title}”
              </span>{' '}
              removes every weekly occurrence of this class from your timetable.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() =>
                  setClassPendingDelete(
                    null
                  )
                }
                className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold py-2.5 rounded-xl"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  deleteClass
                }
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-xl"
              >
                Delete Class
              </button>
            </div>
          </div>
        </div>
      )}

      {studySessionPendingDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() =>
              setStudySessionPendingDelete(
                null
              )
            }
          />

          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-4">
              <Trash2
                size={20}
                className="text-red-600 dark:text-red-400"
              />
            </div>

            <h2 className="font-display font-700 text-xl text-slate-900 dark:text-white">
              Remove study session?
            </h2>

            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              This removes{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                “{studySessionPendingDelete.event.title}”
              </span>{' '}
              from your generated Study Plan.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() =>
                  setStudySessionPendingDelete(
                    null
                  )
                }
                className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold py-2.5 rounded-xl"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  deleteStudySession
                }
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-xl"
              >
                Remove Session
              </button>
            </div>
          </div>
        </div>
      )}

      {editingStudySession && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() =>
              setEditingStudySession(
                null
              )
            }
          />

          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display font-700 text-xl text-slate-900 dark:text-white">
                  Reschedule Study Session
                </h2>

                <p className="text-xs text-slate-400 mt-0.5">
                  {editingStudySession.subject}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditingStudySession(
                    null
                  )
                }
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Day
                </label>

                <select
                  value={
                    studyDay
                  }
                  onChange={e => {
                    setStudyDay(
                      e.target.value
                    )

                    setStudyError('')
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
                >
                  {DAYS.map(
                    day => (
                      <option
                        key={day}
                        value={day}
                      >
                        {day}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Start
                  </label>

                  <input
                    type="time"
                    value={
                      studyStartTime
                    }
                    onChange={e => {
                      setStudyStartTime(
                        e.target.value
                      )

                      setStudyError('')
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    End
                  </label>

                  <input
                    type="time"
                    value={
                      studyEndTime
                    }
                    onChange={e => {
                      setStudyEndTime(
                        e.target.value
                      )

                      setStudyError('')
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {studyError && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {studyError}
                  </p>
                </div>
              )}

              <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900 rounded-xl px-4 py-3">
                <p className="text-xs text-violet-700 dark:text-violet-300">
                  This manually changes this one generated study session in Supabase.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() =>
                  setEditingStudySession(
                    null
                  )
                }
                className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium py-2.5 rounded-xl"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  saveStudySessionChanges
                }
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-2.5 rounded-xl"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() =>
              setEditingClass(
                null
              )
            }
          />

          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display font-700 text-xl text-slate-900 dark:text-white">
                  Edit Class
                </h2>

                <p className="text-xs text-slate-400 mt-0.5">
                  Update the recurring class, lecturer and venue.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditingClass(
                    null
                  )
                }
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Day
                </label>

                <select
                  value={
                    classDay
                  }
                  onChange={e => {
                    setClassDay(
                      e.target.value
                    )

                    setClassError('')
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
                >
                  {DAYS.map(
                    day => (
                      <option
                        key={day}
                        value={day}
                      >
                        {day}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Subject
                </label>

                <select
                  value={
                    classSubject
                  }
                  onChange={e => {
                    setClassSubject(
                      e.target.value
                    )

                    setClassError('')
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
                >
                  {subjects.length ===
                    0 && (
                    <option value="">
                      No subjects available
                    </option>
                  )}

                  {subjects.map(
                    subject => (
                      <option
                        key={subject}
                        value={subject}
                      >
                        {subject}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Start
                  </label>

                  <input
                    type="time"
                    value={
                      classStartTime
                    }
                    onChange={e => {
                      setClassStartTime(
                        e.target.value
                      )

                      setClassError('')
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    End
                  </label>

                  <input
                    type="time"
                    value={
                      classEndTime
                    }
                    onChange={e => {
                      setClassEndTime(
                        e.target.value
                      )

                      setClassError('')
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Venue / Classroom
                </label>

                <div className="relative">
                  <MapPin
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={
                      classVenue
                    }
                    onChange={e => {
                      setClassVenue(
                        e.target.value
                      )

                      setClassError('')
                    }}
                    placeholder="e.g. Computer Lab 2"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Lecturer
                </label>

                <div className="relative">
                  <UserRound
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={
                      classLecturer
                    }
                    onChange={e => {
                      setClassLecturer(
                        e.target.value
                      )

                      setClassError('')
                    }}
                    placeholder="e.g. Dr. John Smith"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {classError && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {classError}
                  </p>
                </div>
              )}

              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Changing the class schedule may affect your generated Study Plan.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() =>
                  setEditingClass(
                    null
                  )
                }
                className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium py-2.5 rounded-xl"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  saveClassChanges
                }
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}