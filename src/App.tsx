import { saveOnboarding } from './utils/saveOnboarding'

import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  LayoutDashboard,
  Sun,
  CalendarDays,
  BookOpen,
  CheckSquare,
  Zap,
  BarChart2,
  Settings,
  HelpCircle,
  Search,
  Bell,
  Plus,
  Moon,
  User,
  X,
  AlertCircle,
  Info,
  Clock,
  GraduationCap,
  CalendarClock,
  LogOut,
  Loader2,
} from 'lucide-react'

import type {
  View,
  UserProfile,
  Task,
  Assessment,
  AppNotification,
  ClassScheduleItem,
  RoutineItem,
  StudyPreference,
} from './types'

import Landing from './components/Landing'
import Auth from './components/Auth'
import Onboarding from './components/Onboarding'
import QuickAddModal from './components/QuickAddModal'

import Dashboard from './views/Dashboard'
import MyDay from './views/MyDay'
import CalendarView from './views/CalendarView'
import TasksView from './views/TasksView'
import AcademicsView from './views/AcademicsView'
import FocusView from './views/FocusView'
import ProgressView from './views/ProgressView'

import { supabase } from './utils/supabase'

type AppState =
  | 'landing'
  | 'auth'
  | 'onboarding'
  | 'app'

type UtilityPanel =
  | 'settings'
  | 'help'
  | 'profile'
  | null

interface SearchResult {
  id: string
  title: string
  subtitle: string
  view: View
  type:
    | 'task'
    | 'subject'
    | 'assessment'
    | 'event'
}

interface CustomEventSearchItem {
  id: string
  title: string
  category: string
  date: string
}

interface AppTask extends Task {
  schedulingType: 'fixed' | 'flexible'
  scheduledDate: string
  scheduledTime: string
}

interface CalendarColors {
  classes: string
  routines: string
  study: string
  events: string
  tasks: string
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

interface UserPreferencesRow {
  user_id: string
  class_color: string | null
  routine_color: string | null
  study_color: string | null
  event_color: string | null
  task_color: string | null
}

interface ProfileRow {
  id: string
  full_name: string | null
  university: string | null
  semester: string | null
  wake_up_time: string | null
  bedtime: string | null
  study_hours_per_week: number | null
  exercise_days_per_week: number | null
  onboarding_completed: boolean | null
}

interface SubjectRow {
  id: string
  name: string
}

interface ClassRow {
  id: string
  subject: string | null
  day: string
  start_time: string
  end_time: string
  venue: string | null
  lecturer: string | null
}

interface RoutineRow {
  id: string
  name: string
  routine_type: 'fixed' | 'flexible'
  days: string[] | null
  start_time: string | null
  end_time: string | null
  duration_minutes: number | null
}

interface StudyPreferenceRow {
  period:
    | 'morning'
    | 'afternoon'
    | 'evening'
  start_time: string
  end_time: string
}

const DEFAULT_CALENDAR_COLORS: CalendarColors = {
  classes: '#4F46E5',
  routines: '#059669',
  study: '#7C3AED',
  events: '#EA580C',
  tasks: '#2563EB',
}

const ASSESSMENT_STYLES = [
  {
    dotColor: '#6366f1',
  },
  {
    dotColor: '#8b5cf6',
  },
  {
    dotColor: '#3b82f6',
  },
  {
    dotColor: '#06b6d4',
  },
  {
    dotColor: '#10b981',
  },
  {
    dotColor: '#f59e0b',
  },
  {
    dotColor: '#f43f5e',
  },
]

const CALENDAR_COLOR_OPTIONS: {
  key: keyof CalendarColors
  label: string
}[] = [
  {
    key: 'classes',
    label: 'Classes',
  },
  {
    key: 'routines',
    label: 'Fixed routines',
  },
  {
    key: 'study',
    label: 'Study plan',
  },
  {
    key: 'events',
    label: 'Events',
  },
  {
    key: 'tasks',
    label: 'Tasks',
  },
]

const NAV_ITEMS: {
  id: View
  label: string
  icon: typeof LayoutDashboard
}[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'myday',
    label: 'My Day',
    icon: Sun,
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: CalendarDays,
  },
  {
    id: 'academics',
    label: 'Academics',
    icon: BookOpen,
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: CheckSquare,
  },
  {
    id: 'focus',
    label: 'Focus',
    icon: Zap,
  },
  {
    id: 'progress',
    label: 'Progress',
    icon: BarChart2,
  },
]

function loadJson<T>(
  key: string,
  fallback: T
): T {
  const saved =
    localStorage.getItem(
      key
    )

  if (!saved) {
    return fallback
  }

  try {
    return JSON.parse(
      saved
    ) as T
  } catch {
    return fallback
  }
}

function loadCalendarColors(): CalendarColors {
  return loadJson<CalendarColors>(
    'mySchedulerCalendarColors',
    DEFAULT_CALENDAR_COLORS
  )
}

function mirrorCalendarColors(
  colors: CalendarColors
) {
  localStorage.setItem(
    'mySchedulerCalendarColors',
    JSON.stringify(
      colors
    )
  )
}

function mapPreferencesToCalendarColors(
  preferences:
    UserPreferencesRow
): CalendarColors {
  return {
    classes:
      preferences.class_color ??
      DEFAULT_CALENDAR_COLORS.classes,

    routines:
      preferences.routine_color ??
      DEFAULT_CALENDAR_COLORS.routines,

    study:
      preferences.study_color ??
      DEFAULT_CALENDAR_COLORS.study,

    events:
      preferences.event_color ??
      DEFAULT_CALENDAR_COLORS.events,

    tasks:
      preferences.task_color ??
      DEFAULT_CALENDAR_COLORS.tasks,
  }
}

function getPreferenceColumn(
  key: keyof CalendarColors
):
  | 'class_color'
  | 'routine_color'
  | 'study_color'
  | 'event_color'
  | 'task_color' {
  if (
    key ===
    'classes'
  ) {
    return 'class_color'
  }

  if (
    key ===
    'routines'
  ) {
    return 'routine_color'
  }

  if (
    key ===
    'study'
  ) {
    return 'study_color'
  }

  if (
    key ===
    'events'
  ) {
    return 'event_color'
  }

  return 'task_color'
}

function cleanTime(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return ''
  }

  return value.slice(
    0,
    5
  )
}

function getTodayDateKey() {
  const today =
    new Date()

  const year =
    today.getFullYear()

  const month =
    String(
      today.getMonth() +
        1
    ).padStart(
      2,
      '0'
    )

  const day =
    String(
      today.getDate()
    ).padStart(
      2,
      '0'
    )

  return `${year}-${month}-${day}`
}

function getTomorrowDateKey() {
  const tomorrow =
    new Date()

  tomorrow.setDate(
    tomorrow.getDate() +
      1
  )

  const year =
    tomorrow.getFullYear()

  const month =
    String(
      tomorrow.getMonth() +
        1
    ).padStart(
      2,
      '0'
    )

  const day =
    String(
      tomorrow.getDate()
    ).padStart(
      2,
      '0'
    )

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

function getTodayName() {
  return new Intl.DateTimeFormat(
    'en-US',
    {
      weekday:
        'long',
    }
  ).format(
    new Date()
  )
}

function formatTime(
  time: string
) {
  if (!time) {
    return ''
  }

  const [
    hourString,
    minute,
  ] = time.split(':')

  const hour =
    Number(
      hourString
    )

  const ampm =
    hour >= 12
      ? 'PM'
      : 'AM'

  const displayHour =
    hour % 12 || 12

  return `${displayHour}:${minute} ${ampm}`
}

async function loadProfileFromSupabase(
  userId: string
): Promise<{
  profile:
    | UserProfile
    | null
  onboardingCompleted:
    boolean
}> {
  const {
    data:
      profileData,
    error:
      profileError,
  } =
    await supabase
      .from(
        'profiles'
      )
      .select(
        `
          id,
          full_name,
          university,
          semester,
          wake_up_time,
          bedtime,
          study_hours_per_week,
          exercise_days_per_week,
          onboarding_completed
        `
      )
      .eq(
        'id',
        userId
      )
      .maybeSingle()

  if (
    profileError
  ) {
    throw profileError
  }

  if (!profileData) {
    return {
      profile:
        null,
      onboardingCompleted:
        false,
    }
  }

  const profileRow =
    profileData as ProfileRow

  if (
    !profileRow.onboarding_completed
  ) {
    return {
      profile:
        null,
      onboardingCompleted:
        false,
    }
  }

  const [
    subjectsResult,
    classesResult,
    routinesResult,
    preferencesResult,
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
          userId
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
          'classes'
        )
        .select(
          `
            id,
            subject,
            day,
            start_time,
            end_time,
            venue,
            lecturer
          `
        )
        .eq(
          'user_id',
          userId
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
            routine_type,
            days,
            start_time,
            end_time,
            duration_minutes
          `
        )
        .eq(
          'user_id',
          userId
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
          'study_preferences'
        )
        .select(
          `
            period,
            start_time,
            end_time
          `
        )
        .eq(
          'user_id',
          userId
        ),
    ])

  if (
    subjectsResult.error
  ) {
    throw subjectsResult.error
  }

  if (
    classesResult.error
  ) {
    throw classesResult.error
  }

  if (
    routinesResult.error
  ) {
    throw routinesResult.error
  }

  if (
    preferencesResult.error
  ) {
    throw preferencesResult.error
  }

  const subjectRows =
    (
      subjectsResult.data ??
      []
    ) as SubjectRow[]

  const classRows =
    (
      classesResult.data ??
      []
    ) as ClassRow[]

  const routineRows =
    (
      routinesResult.data ??
      []
    ) as RoutineRow[]

  const preferenceRows =
    (
      preferencesResult.data ??
      []
    ) as StudyPreferenceRow[]

  const classes:
    ClassScheduleItem[] =
    classRows.map(
      item => ({
        id:
          item.id,

        day:
          item.day,

        subject:
          item.subject ??
          'Class',

        startTime:
          cleanTime(
            item.start_time
          ),

        endTime:
          cleanTime(
            item.end_time
          ),

        venue:
          item.venue ??
          '',

        lecturer:
          item.lecturer ??
          '',
      })
    )

  const routines:
    RoutineItem[] =
    routineRows.map(
      item => {
        if (
          item.routine_type ===
          'flexible'
        ) {
          return {
            id:
              item.id,

            name:
              item.name,

            type:
              'flexible',

            days:
              item.days ??
              [],

            durationMinutes:
              item.duration_minutes ??
              0,
          }
        }

        return {
          id:
            item.id,

          name:
            item.name,

          type:
            'fixed',

          days:
            item.days ??
            [],

          startTime:
            cleanTime(
              item.start_time
            ),

          endTime:
            cleanTime(
              item.end_time
            ),
        }
      }
    )

  const studyPreferences:
    StudyPreference[] =
    preferenceRows.map(
      item => ({
        period:
          item.period,

        startTime:
          cleanTime(
            item.start_time
          ),

        endTime:
          cleanTime(
            item.end_time
          ),
      })
    )

  const profile:
    UserProfile = {
    name:
      profileRow.full_name ??
      'Student',

    university:
      profileRow.university ??
      '',

    semester:
      profileRow.semester ??
      '',

    wakeUpTime:
      cleanTime(
        profileRow.wake_up_time
      ),

    bedtime:
      cleanTime(
        profileRow.bedtime
      ),

    subjects:
      subjectRows.map(
        subject =>
          subject.name
      ),

    classes,

    routines,

    studyHoursPerWeek:
      Number(
        profileRow.study_hours_per_week ??
          0
      ),

    exerciseDaysPerWeek:
      Number(
        profileRow.exercise_days_per_week ??
          0
      ),

    studyPreferences,
  }

  return {
    profile,
    onboardingCompleted:
      true,
  }
}

function clearAccountLocalStorage() {
  const accountKeys = [
    'mySchedulerProfile',
    'mySchedulerTasks',
    'mySchedulerCalendarColors',
  ]

  accountKeys.forEach(
    key => {
      localStorage.removeItem(
        key
      )
    }
  )
}

function buildNotifications(
  profile: UserProfile | null,
  tasks: AppTask[],
  assessments: Assessment[],
  assessmentDates: Record<
    string,
    string
  >
): AppNotification[] {
  const result:
    AppNotification[] =
    []

  const incompleteTasks =
    tasks.filter(
      task =>
        !task.completed
    )

  const overdueTasks =
    incompleteTasks
      .filter(
        task =>
          task.dueDate &&
          calculateDaysUntilDue(
            task.dueDate
          ) < 0
      )
      .sort(
        (
          a,
          b
        ) =>
          calculateDaysUntilDue(
            a.dueDate
          ) -
          calculateDaysUntilDue(
            b.dueDate
          )
      )

  overdueTasks
    .slice(
      0,
      3
    )
    .forEach(
      task => {
        const days =
          Math.abs(
            calculateDaysUntilDue(
              task.dueDate
            )
          )

        result.push({
          id:
            `task-overdue-${task.id}`,

          message:
            `${task.title} is ${days} ${
              days === 1
                ? 'day'
                : 'days'
            } overdue.`,

          type:
            'warning',

          time:
            'Needs attention',
        })
      }
    )

  const fixedToday =
    incompleteTasks.filter(
      task =>
        task.schedulingType ===
          'fixed' &&
        task.scheduledDate ===
          getTodayDateKey()
    )

  fixedToday.forEach(
    task => {
      result.push({
        id:
          `task-scheduled-today-${task.id}`,

        message:
          `${task.title} is scheduled today${
            task.scheduledTime
              ? ` at ${formatTime(
                  task.scheduledTime
                )}`
              : ''
          }.`,

        type:
          'reminder',

        time:
          task.duration,
      })
    }
  )

  const fixedTomorrow =
    incompleteTasks.filter(
      task =>
        task.schedulingType ===
          'fixed' &&
        task.scheduledDate ===
          getTomorrowDateKey()
    )

  fixedTomorrow
    .slice(
      0,
      2
    )
    .forEach(
      task => {
        result.push({
          id:
            `task-scheduled-tomorrow-${task.id}`,

          message:
            `${task.title} is scheduled tomorrow${
              task.scheduledTime
                ? ` at ${formatTime(
                    task.scheduledTime
                  )}`
              : ''
          }.`,

          type:
            'info',

          time:
            task.duration,
        })
      }
    )

  const dueToday =
    incompleteTasks.filter(
      task =>
        task.dueDate ===
          getTodayDateKey() &&
        !(
          task.schedulingType ===
            'fixed' &&
          task.scheduledDate ===
            task.dueDate
        )
    )

  dueToday.forEach(
    task => {
      result.push({
        id:
          `task-today-${task.id}`,

        message:
          `${task.title} is due today.`,

        type:
          'reminder',

        time:
          task.duration,
      })
    }
  )

  const dueTomorrow =
    incompleteTasks.filter(
      task =>
        task.dueDate ===
          getTomorrowDateKey() &&
        !(
          task.schedulingType ===
            'fixed' &&
          task.scheduledDate ===
            task.dueDate
        )
    )

  dueTomorrow
    .slice(
      0,
      2
    )
    .forEach(
      task => {
        result.push({
          id:
            `task-tomorrow-${task.id}`,

          message:
            `${task.title} is due tomorrow.`,

          type:
            'warning',

          time:
            task.duration,
        })
      }
    )

  assessments.forEach(
    assessment => {
      const date =
        assessmentDates[
          assessment.id
        ]

      if (!date) {
        return
      }

      const days =
        calculateDaysUntilDue(
          date
        )

      if (
        days >= 0 &&
        days <= 7
      ) {
        result.push({
          id:
            `assessment-${assessment.id}`,

          message:
            days === 0
              ? `${assessment.subject} ${assessment.type} is today.`
              : `${assessment.subject} ${assessment.type} is in ${days} ${
                  days === 1
                    ? 'day'
                    : 'days'
                }.`,

          type:
            days <= 2
              ? 'warning'
              : 'reminder',

          time:
            `${assessment.progress}% prepared`,
        })
      }
    }
  )

  const todayName =
    getTodayName()

  const classes =
    profile?.classes ??
    []

  const todayClasses =
    classes
      .filter(
        item =>
          item.day ===
          todayName
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

  const now =
    new Date()
      .toTimeString()
      .slice(
        0,
        5
      )

  const nextClass =
    todayClasses.find(
      item =>
        item.startTime >
        now
    )

  if (nextClass) {
    result.push({
      id:
        `next-class-${nextClass.id}`,

      message:
        `${nextClass.subject} starts at ${formatTime(
          nextClass.startTime
        )}.`,

      type:
        'info',

      time:
        nextClass.venue?.trim() ||
        'Venue not set',
    })
  }

  if (
    result.length ===
    0
  ) {
    result.push({
      id:
        'all-clear',

      message:
        'Nothing urgent needs your attention right now.',

      type:
        'info',

      time:
        'All clear',
    })
  }

  return result.slice(
    0,
    8
  )
}

function buildSearchResults(
  searchValue: string,
  profile: UserProfile | null,
  tasks: Task[],
  assessments: Assessment[],
  customEvents:
    CustomEventSearchItem[]
): SearchResult[] {
  const query =
    searchValue
      .trim()
      .toLowerCase()

  if (!query) {
    return []
  }

  const results:
    SearchResult[] =
    []

  tasks.forEach(
    task => {
      const text =
        `${task.title} ${task.subject}`.toLowerCase()

      if (
        text.includes(
          query
        )
      ) {
        results.push({
          id:
            `task-${task.id}`,

          title:
            task.title,

          subtitle:
            task.subject ||
            'Task',

          view:
            'tasks',

          type:
            'task',
        })
      }
    }
  )

  ;(
    profile?.subjects ??
    []
  ).forEach(
    subject => {
      if (
        subject
          .toLowerCase()
          .includes(
            query
          )
      ) {
        results.push({
          id:
            `subject-${subject}`,

          title:
            subject,

          subtitle:
            'Subject',

          view:
            'academics',

          type:
            'subject',
        })
      }
    }
  )

  assessments.forEach(
    assessment => {
      const text =
        `${assessment.subject} ${assessment.type}`.toLowerCase()

      if (
        text.includes(
          query
        )
      ) {
        results.push({
          id:
            `assessment-${assessment.id}`,

          title:
            `${assessment.subject} ${assessment.type}`,

          subtitle:
            'Assessment',

          view:
            'academics',

          type:
            'assessment',
        })
      }
    }
  )

  customEvents.forEach(
    event => {
      const text =
        `${event.title} ${event.category} ${event.date}`.toLowerCase()

      if (
        text.includes(
          query
        )
      ) {
        results.push({
          id:
            `event-${event.id}`,

          title:
            event.title,

          subtitle:
            event.category ||
            'Calendar event',

          view:
            'calendar',

          type:
            'event',
        })
      }
    }
  )

  return results.slice(
    0,
    8
  )
}

function NotifIcon({
  type,
}: {
  type:
    | 'warning'
    | 'info'
    | 'reminder'
}) {
  if (
    type ===
    'warning'
  ) {
    return (
      <AlertCircle
        size={14}
        className="text-amber-500 flex-shrink-0 mt-0.5"
      />
    )
  }

  if (
    type ===
    'reminder'
  ) {
    return (
      <Clock
        size={14}
        className="text-violet-500 flex-shrink-0 mt-0.5"
      />
    )
  }

  return (
    <Info
      size={14}
      className="text-indigo-500 flex-shrink-0 mt-0.5"
    />
  )
}

function SearchResultIcon({
  type,
}: {
  type:
    SearchResult['type']
}) {
  if (
    type ===
    'task'
  ) {
    return (
      <CheckSquare
        size={15}
        className="text-indigo-500"
      />
    )
  }

  if (
    type ===
    'assessment'
  ) {
    return (
      <GraduationCap
        size={15}
        className="text-violet-500"
      />
    )
  }

  if (
    type ===
    'event'
  ) {
    return (
      <CalendarClock
        size={15}
        className="text-cyan-500"
      />
    )
  }

  return (
    <BookOpen
      size={15}
      className="text-emerald-500"
    />
  )
}

export default function App() {
  const [
    appState,
    setAppState,
  ] =
    useState<AppState>(
      'landing'
    )

  const [
    authChecking,
    setAuthChecking,
  ] =
    useState(
      true
    )

  const [
    signingOut,
    setSigningOut,
  ] =
    useState(
      false
    )

  const [
    userProfile,
    setUserProfile,
  ] =
    useState<UserProfile | null>(
      null
    )

  const [
    view,
    setView,
  ] =
    useState<View>(
      'dashboard'
    )

  const [
    dark,
    setDark,
  ] =
    useState(
      () =>
        localStorage.getItem(
          'mySchedulerDarkMode'
        ) ===
        'true'
    )

  const [
    showQuickAdd,
    setShowQuickAdd,
  ] =
    useState(
      false
    )

  const [
    showNotifications,
    setShowNotifications,
  ] =
    useState(
      false
    )

  const [
    searchValue,
    setSearchValue,
  ] =
    useState(
      ''
    )

  const [
    searchFocused,
    setSearchFocused,
  ] =
    useState(
      false
    )

  const [
    sidebarCollapsed,
    setSidebarCollapsed,
  ] =
    useState(
      false
    )

  const [
    utilityPanel,
    setUtilityPanel,
  ] =
    useState<UtilityPanel>(
      null
    )

  const [
    calendarColors,
    setCalendarColors,
  ] =
    useState<CalendarColors>(
      () =>
        loadCalendarColors()
    )

  const [
    loadingPreferences,
    setLoadingPreferences,
  ] =
    useState(
      false
    )

  const [
    savingPreference,
    setSavingPreference,
  ] =
    useState<
      keyof CalendarColors |
      null
    >(
      null
    )

  const [
    profileName,
    setProfileName,
  ] =
    useState('')

  const [
    profileUniversity,
    setProfileUniversity,
  ] =
    useState('')

  const [
    profileSemester,
    setProfileSemester,
  ] =
    useState('')

  const [
    profileWakeUpTime,
    setProfileWakeUpTime,
  ] =
    useState('')

  const [
    profileBedtime,
    setProfileBedtime,
  ] =
    useState('')

  const [
    profileStudyHours,
    setProfileStudyHours,
  ] =
    useState('0')

  const [
    profileExerciseDays,
    setProfileExerciseDays,
  ] =
    useState('0')

  const [
    savingProfile,
    setSavingProfile,
  ] =
    useState(false)

  const [
    profileSaveError,
    setProfileSaveError,
  ] =
    useState('')

  const [
    profileSaveSuccess,
    setProfileSaveSuccess,
  ] =
    useState(false)

  const [
    appTasks,
    setAppTasks,
  ] =
    useState<AppTask[]>(
      []
    )

  const [
    appAssessments,
    setAppAssessments,
  ] =
    useState<Assessment[]>(
      []
    )

  const [
    appAssessmentDates,
    setAppAssessmentDates,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({})

  const [
    appCustomEvents,
    setAppCustomEvents,
  ] =
    useState<
      CustomEventSearchItem[]
    >([])

  const [
    taskRefreshKey,
    setTaskRefreshKey,
  ] =
    useState(
      0
    )

  useEffect(
    () => {
      function refreshGlobalTasks() {
        setTaskRefreshKey(
          value =>
            value + 1
        )
      }

      window.addEventListener(
        'mySchedulerTasksUpdated',
        refreshGlobalTasks
      )

      return () => {
        window.removeEventListener(
          'mySchedulerTasksUpdated',
          refreshGlobalTasks
        )
      }
    },
    []
  )

  const restoreCurrentUserState =
    useCallback(
      async () => {
        const {
          data: {
            session,
          },
          error:
            sessionError,
        } =
          await supabase.auth.getSession()

        if (
          sessionError
        ) {
          throw sessionError
        }

        if (
          !session?.user
        ) {
          setUserProfile(
            null
          )

          setAppState(
            'landing'
          )

          return
        }

        const {
          profile,
          onboardingCompleted,
        } =
          await loadProfileFromSupabase(
            session.user.id
          )

        if (
          !onboardingCompleted ||
          !profile
        ) {
          setUserProfile(
            null
          )

          localStorage.removeItem(
            'mySchedulerProfile'
          )

          setAppState(
            'onboarding'
          )

          return
        }

        setUserProfile(
          profile
        )

        localStorage.setItem(
          'mySchedulerProfile',
          JSON.stringify(
            profile
          )
        )

        setAppState(
          'app'
        )
      },
      []
    )

  useEffect(
    () => {
      let cancelled =
        false

      async function restoreSession() {
        try {
          await restoreCurrentUserState()
        } catch (
          error
        ) {
          console.error(
            'Failed to restore Supabase session:',
            error
          )

          if (
            !cancelled
          ) {
            setUserProfile(
              null
            )

            setAppState(
              'landing'
            )
          }
        } finally {
          if (
            !cancelled
          ) {
            setAuthChecking(
              false
            )
          }
        }
      }

      restoreSession()

      const {
        data: {
          subscription,
        },
      } =
        supabase.auth.onAuthStateChange(
          (
            event
          ) => {
            if (
              event ===
              'SIGNED_OUT'
            ) {
              setUserProfile(
                null
              )

              setAppTasks(
                []
              )

              setAppAssessments(
                []
              )

              setAppAssessmentDates(
                {}
              )

              setAppCustomEvents(
                []
              )

              setUtilityPanel(
                null
              )

              setShowNotifications(
                false
              )

              setShowQuickAdd(
                false
              )

              setSearchValue(
                ''
              )

              setView(
                'dashboard'
              )

              setAppState(
                'landing'
              )
            }
          }
        )

      return () => {
        cancelled =
          true

        subscription.unsubscribe()
      }
    },
    [
      restoreCurrentUserState,
    ]
  )

  useEffect(
    () => {
      if (
        appState !==
        'app'
      ) {
        return
      }

      let cancelled =
        false

      async function loadUserPreferences() {
        setLoadingPreferences(
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

          if (
            userError
          ) {
            throw userError
          }

          if (!user) {
            return
          }

          const {
            data,
            error:
              preferencesError,
          } =
            await supabase
              .from(
                'user_preferences'
              )
              .select(
                `
                  user_id,
                  class_color,
                  routine_color,
                  study_color,
                  event_color,
                  task_color
                `
              )
              .eq(
                'user_id',
                user.id
              )
              .maybeSingle()

          if (
            preferencesError
          ) {
            throw preferencesError
          }

          if (!data) {
            const {
              data:
                insertedPreferences,
              error:
                insertError,
            } =
              await supabase
                .from(
                  'user_preferences'
                )
                .insert({
                  user_id:
                    user.id,

                  class_color:
                    DEFAULT_CALENDAR_COLORS.classes,

                  routine_color:
                    DEFAULT_CALENDAR_COLORS.routines,

                  study_color:
                    DEFAULT_CALENDAR_COLORS.study,

                  event_color:
                    DEFAULT_CALENDAR_COLORS.events,

                  task_color:
                    DEFAULT_CALENDAR_COLORS.tasks,
                })
                .select(
                  `
                    user_id,
                    class_color,
                    routine_color,
                    study_color,
                    event_color,
                    task_color
                  `
                )
                .single()

            if (
              insertError
            ) {
              throw insertError
            }

            const colors =
              mapPreferencesToCalendarColors(
                insertedPreferences as UserPreferencesRow
              )

            if (
              !cancelled
            ) {
              setCalendarColors(
                colors
              )

              mirrorCalendarColors(
                colors
              )
            }

            return
          }

          const colors =
            mapPreferencesToCalendarColors(
              data as UserPreferencesRow
            )

          if (
            !cancelled
          ) {
            setCalendarColors(
              colors
            )

            mirrorCalendarColors(
              colors
            )
          }
        } catch (
          error
        ) {
          console.error(
            'Failed to load user preferences:',
            error
          )
        } finally {
          if (
            !cancelled
          ) {
            setLoadingPreferences(
              false
            )
          }
        }
      }

      loadUserPreferences()

      return () => {
        cancelled =
          true
      }
    },
    [
      appState,
    ]
  )

  useEffect(
    () => {
      if (
        appState !==
        'app'
      ) {
        return
      }

      let cancelled =
        false

      async function loadAppTasks() {
        try {
          const {
            data: {
              user,
            },
            error:
              userError,
          } =
            await supabase.auth.getUser()

          if (
            userError
          ) {
            throw userError
          }

          if (!user) {
            if (
              !cancelled
            ) {
              setAppTasks(
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
            AppTask[] =
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

                const priority:
                  Task['priority'] =
                  task.priority ===
                    'high' ||
                  task.priority ===
                    'low'
                    ? task.priority
                    : 'medium'

                const durationMinutes =
                  Math.max(
                    0,
                    Number(
                      task.duration_minutes ??
                        0
                    )
                  )

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

                  schedulingType:
                    task.scheduling_type ===
                      'fixed'
                      ? 'fixed'
                      : 'flexible',

                  scheduledDate:
                    task.scheduled_date
                      ? task.scheduled_date.slice(
                          0,
                          10
                        )
                      : '',

                  scheduledTime:
                    cleanTime(
                      task.scheduled_time
                    ),
                }
              }
            )

          if (
            !cancelled
          ) {
            setAppTasks(
              loadedTasks
            )
          }
        } catch (
          error
        ) {
          console.error(
            'Failed to load tasks for search and notifications:',
            error
          )

          if (
            !cancelled
          ) {
            setAppTasks(
              []
            )
          }
        }
      }

      loadAppTasks()

      return () => {
        cancelled =
          true
      }
    },
    [
      appState,
      view,
      taskRefreshKey,
    ]
  )

  useEffect(
    () => {
      if (
        appState !==
        'app'
      ) {
        return
      }

      let cancelled =
        false

      async function loadAppAssessments() {
        try {
          const {
            data: {
              user,
            },
            error:
              userError,
          } =
            await supabase.auth.getUser()

          if (
            userError
          ) {
            throw userError
          }

          if (!user) {
            if (
              !cancelled
            ) {
              setAppAssessments(
                []
              )

              setAppAssessmentDates(
                {}
              )
            }

            return
          }

          const {
            data:
              assessmentRows,
            error:
              assessmentError,
          } =
            await supabase
              .from(
                'assessments'
              )
              .select(
                '*'
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
              )

          if (
            assessmentError
          ) {
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
            AssessmentTopicRow[] =
            []

          if (
            assessmentIds.length >
            0
          ) {
            const {
              data:
                topicData,
              error:
                topicsError,
            } =
              await supabase
                .from(
                  'assessment_topics'
                )
                .select(
                  '*'
                )
                .in(
                  'assessment_id',
                  assessmentIds
                )

            if (
              topicsError
            ) {
              throw topicsError
            }

            topicRows =
              (
                topicData ??
                []
              ) as AssessmentTopicRow[]
          }

          const dates:
            Record<
              string,
              string
            > =
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

                const style =
                  ASSESSMENT_STYLES[
                    index %
                      ASSESSMENT_STYLES.length
                  ]

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

          if (
            !cancelled
          ) {
            setAppAssessments(
              loadedAssessments
            )

            setAppAssessmentDates(
              dates
            )

          }
        } catch (
          error
        ) {
          console.error(
            'Failed to load assessments for search and notifications:',
            error
          )

          if (
            !cancelled
          ) {
            setAppAssessments(
              []
            )

            setAppAssessmentDates(
              {}
            )
          }
        }
      }

      loadAppAssessments()

      return () => {
        cancelled =
          true
      }
    },
    [
      appState,
      view,
    ]
  )

  useEffect(
    () => {
      if (
        appState !==
        'app'
      ) {
        return
      }

      let cancelled =
        false

      async function loadAppCustomEvents() {
        try {
          const {
            data: {
              user,
            },
            error:
              userError,
          } =
            await supabase.auth.getUser()

          if (
            userError
          ) {
            throw userError
          }

          if (!user) {
            if (
              !cancelled
            ) {
              setAppCustomEvents(
                []
              )
            }

            return
          }

          const {
            data,
            error:
              eventsError,
          } =
            await supabase
              .from(
                'custom_events'
              )
              .select(
                `
                  id,
                  title,
                  category,
                  event_date
                `
              )
              .eq(
                'user_id',
                user.id
              )
              .order(
                'event_date',
                {
                  ascending:
                    true,
                }
              )

          if (
            eventsError
          ) {
            throw eventsError
          }

          const loadedEvents:
            CustomEventSearchItem[] =
            (
              data ??
              []
            ).map(
              event => ({
                id:
                  event.id,

                title:
                  event.title,

                category:
                  event.category ??
                  'Personal',

                date:
                  event.event_date ??
                  '',
              })
            )

          if (
            !cancelled
          ) {
            setAppCustomEvents(
              loadedEvents
            )
          }
        } catch (
          error
        ) {
          console.error(
            'Failed to load custom events for global search:',
            error
          )

          if (
            !cancelled
          ) {
            setAppCustomEvents(
              []
            )
          }
        }
      }

      loadAppCustomEvents()

      return () => {
        cancelled =
          true
      }
    },
    [
      appState,
      view,
    ]
  )

  async function updateCalendarColor(
    key:
      keyof CalendarColors,
    value:
      string
  ) {
    const previousColors =
      calendarColors

    const nextColors = {
      ...calendarColors,
      [key]:
        value,
    }

    setCalendarColors(
      nextColors
    )

    mirrorCalendarColors(
      nextColors
    )

    setSavingPreference(
      key
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

      if (
        userError
      ) {
        throw userError
      }

      if (!user) {
        throw new Error(
          'You are not signed in.'
        )
      }

      const column =
        getPreferenceColumn(
          key
        )

      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            'user_preferences'
          )
          .upsert(
            {
              user_id:
                user.id,

              [column]:
                value,
            },
            {
              onConflict:
                'user_id',
            }
          )

      if (
        updateError
      ) {
        throw updateError
      }
    } catch (
      error
    ) {
      console.error(
        'Failed to save calendar color preference:',
        error
      )

      setCalendarColors(
        previousColors
      )

      mirrorCalendarColors(
        previousColors
      )

      alert(
        'Could not save this color. Please try again.'
      )
    } finally {
      setSavingPreference(
        null
      )
    }
  }

  async function resetCalendarColors() {
    const previousColors =
      calendarColors

    setCalendarColors(
      DEFAULT_CALENDAR_COLORS
    )

    mirrorCalendarColors(
      DEFAULT_CALENDAR_COLORS
    )

    setSavingPreference(
      'classes'
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

      if (
        userError
      ) {
        throw userError
      }

      if (!user) {
        throw new Error(
          'You are not signed in.'
        )
      }

      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            'user_preferences'
          )
          .upsert(
            {
              user_id:
                user.id,

              class_color:
                DEFAULT_CALENDAR_COLORS.classes,

              routine_color:
                DEFAULT_CALENDAR_COLORS.routines,

              study_color:
                DEFAULT_CALENDAR_COLORS.study,

              event_color:
                DEFAULT_CALENDAR_COLORS.events,

              task_color:
                DEFAULT_CALENDAR_COLORS.tasks,
            },
            {
              onConflict:
                'user_id',
            }
          )

      if (
        updateError
      ) {
        throw updateError
      }
    } catch (
      error
    ) {
      console.error(
        'Failed to reset calendar colors:',
        error
      )

      setCalendarColors(
        previousColors
      )

      mirrorCalendarColors(
        previousColors
      )

      alert(
        'Could not reset the colors. Please try again.'
      )
    } finally {
      setSavingPreference(
        null
      )
    }
  }

  async function handleSignOut() {
    if (
      signingOut
    ) {
      return
    }

    setSigningOut(
      true
    )

    try {
      const {
        error,
      } =
        await supabase.auth.signOut()

      if (
        error
      ) {
        throw error
      }

      clearAccountLocalStorage()

      setUserProfile(
        null
      )

      setAppTasks(
        []
      )

      setAppAssessments(
        []
      )

      setAppAssessmentDates(
        {}
      )

      setAppCustomEvents(
        []
      )

      setCalendarColors(
        DEFAULT_CALENDAR_COLORS
      )

      setUtilityPanel(
        null
      )

      setShowQuickAdd(
        false
      )

      setShowNotifications(
        false
      )

      setSearchValue(
        ''
      )

      setSearchFocused(
        false
      )

      setView(
        'dashboard'
      )

      setAppState(
        'landing'
      )
    } catch (
      error
    ) {
      console.error(
        'Failed to sign out:',
        error
      )

      alert(
        'Could not sign out. Please try again.'
      )
    } finally {
      setSigningOut(
        false
      )
    }
  }

  const notifications =
    buildNotifications(
      userProfile,
      appTasks,
      appAssessments,
      appAssessmentDates
    )

  const actionableNotificationCount =
    notifications.filter(
      notification =>
        notification.id !==
        'all-clear'
    ).length

  const searchResults =
    buildSearchResults(
      searchValue,
      userProfile,
      appTasks,
      appAssessments,
      appCustomEvents
    )

  function openProfilePanel() {
    setProfileName(
      userProfile?.name ??
        ''
    )

    setProfileUniversity(
      userProfile?.university ??
        ''
    )

    setProfileSemester(
      userProfile?.semester ??
        ''
    )

    setProfileWakeUpTime(
      userProfile?.wakeUpTime ??
        ''
    )

    setProfileBedtime(
      userProfile?.bedtime ??
        ''
    )

    setProfileStudyHours(
      String(
        userProfile?.studyHoursPerWeek ??
          0
      )
    )

    setProfileExerciseDays(
      String(
        userProfile?.exerciseDaysPerWeek ??
          0
      )
    )

    setProfileSaveError(
      ''
    )

    setProfileSaveSuccess(
      false
    )

    setUtilityPanel(
      'profile'
    )
  }

  async function saveProfileChanges() {
    if (
      savingProfile
    ) {
      return
    }

    const cleanName =
      profileName.trim()

    const cleanUniversity =
      profileUniversity.trim()

    const cleanSemester =
      profileSemester.trim()

    const studyHours =
      Number(
        profileStudyHours
      )

    const exerciseDays =
      Number(
        profileExerciseDays
      )

    setProfileSaveError(
      ''
    )

    setProfileSaveSuccess(
      false
    )

    if (!cleanName) {
      setProfileSaveError(
        'Please enter your name.'
      )

      return
    }

    if (
      Number.isNaN(
        studyHours
      ) ||
      studyHours < 0
    ) {
      setProfileSaveError(
        'Weekly study hours must be 0 or greater.'
      )

      return
    }

    if (
      Number.isNaN(
        exerciseDays
      ) ||
      exerciseDays < 0 ||
      exerciseDays > 7
    ) {
      setProfileSaveError(
        'Exercise days must be between 0 and 7.'
      )

      return
    }

    setSavingProfile(
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

      if (
        userError
      ) {
        throw userError
      }

      if (!user) {
        throw new Error(
          'You are not signed in.'
        )
      }

      const {
        error:
          profileError,
      } =
        await supabase
          .from(
            'profiles'
          )
          .update({
            full_name:
              cleanName,

            university:
              cleanUniversity,

            semester:
              cleanSemester,

            wake_up_time:
              profileWakeUpTime ||
              null,

            bedtime:
              profileBedtime ||
              null,

            study_hours_per_week:
              Math.floor(
                studyHours
              ),

            exercise_days_per_week:
              Math.floor(
                exerciseDays
              ),
          })
          .eq(
            'id',
            user.id
          )

      if (
        profileError
      ) {
        throw profileError
      }

      const {
        error:
          authUpdateError,
      } =
        await supabase.auth.updateUser({
          data: {
            full_name:
              cleanName,
          },
        })

      if (
        authUpdateError
      ) {
        console.warn(
          'Profile was saved, but auth metadata could not be updated:',
          authUpdateError
        )
      }

      if (userProfile) {
        const updatedProfile:
          UserProfile = {
          ...userProfile,

          name:
            cleanName,

          university:
            cleanUniversity,

          semester:
            cleanSemester,

          wakeUpTime:
            profileWakeUpTime,

          bedtime:
            profileBedtime,

          studyHoursPerWeek:
            Math.floor(
              studyHours
            ),

          exerciseDaysPerWeek:
            Math.floor(
              exerciseDays
            ),
        }

        setUserProfile(
          updatedProfile
        )

        localStorage.setItem(
          'mySchedulerProfile',
          JSON.stringify(
            updatedProfile
          )
        )
      }

      setProfileStudyHours(
        String(
          Math.floor(
            studyHours
          )
        )
      )

      setProfileExerciseDays(
        String(
          Math.floor(
            exerciseDays
          )
        )
      )

      setProfileSaveSuccess(
        true
      )
    } catch (
      error
    ) {
      console.error(
        'Failed to save profile:',
        error
      )

      setProfileSaveError(
        error instanceof Error
          ? error.message
          : 'Your profile could not be saved.'
      )
    } finally {
      setSavingProfile(
        false
      )
    }
  }

  function navigateTo(
    nextView: View
  ) {
    setView(
      nextView
    )

    setSearchValue(
      ''
    )

    setSearchFocused(
      false
    )

    setShowNotifications(
      false
    )
  }

  function toggleDarkMode() {
    setDark(
      current => {
        const next =
          !current

        localStorage.setItem(
          'mySchedulerDarkMode',
          String(
            next
          )
        )

        return next
      }
    )
  }

  if (
    authChecking
  ) {
    return (
      <div
        className={
          dark
            ? 'dark'
            : ''
        }
        style={{
          height:
            '100%',
        }}
      >
        <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">

          <div className="flex flex-col items-center gap-3">

            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg">

              <CalendarDays
                size={22}
                className="text-white"
              />

            </div>

            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">

              <Loader2
                size={16}
                className="animate-spin"
              />

              <span className="text-sm font-medium">
                Loading your scheduler...
              </span>

            </div>

          </div>

        </div>
      </div>
    )
  }

  if (
    appState ===
    'landing'
  ) {
    return (
      <div
        className={
          dark
            ? 'dark'
            : ''
        }
        style={{
          height:
            '100%',
        }}
      >
        <Landing
          onStart={() =>
            setAppState(
              'auth'
            )
          }
          onExplore={() =>
            setAppState(
              'auth'
            )
          }
        />
      </div>
    )
  }

  if (
    appState ===
    'auth'
  ) {
    return (
      <div
        className={
          dark
            ? 'dark'
            : ''
        }
        style={{
          height:
            '100%',
        }}
      >
        <Auth
          onAuthenticated={async () => {
            setAuthChecking(
              true
            )

            try {
              await restoreCurrentUserState()
            } catch (
              error
            ) {
              console.error(
                'Failed to load signed-in user:',
                error
              )

              alert(
                'You signed in, but your scheduler data could not be loaded. Please try again.'
              )
            } finally {
              setAuthChecking(
                false
              )
            }
          }}
        />
      </div>
    )
  }

  if (
    appState ===
    'onboarding'
  ) {
    return (
      <div
        className={
          dark
            ? 'dark'
            : ''
        }
        style={{
          height:
            '100%',
        }}
      >
        <Onboarding
          onComplete={async (
            profile
          ) => {
            try {
              await saveOnboarding(
                profile
              )

              setUserProfile(
                profile
              )

              localStorage.setItem(
                'mySchedulerProfile',
                JSON.stringify(
                  profile
                )
              )

              setAppState(
                'app'
              )

              setView(
                'dashboard'
              )
            } catch (
              error
            ) {
              console.error(
                'Failed to save onboarding:',
                error
              )

              if (
                error instanceof
                Error
              ) {
                alert(
                  `Could not save your setup: ${error.message}`
                )
              } else {
                alert(
                  'Could not save your setup. Please try again.'
                )
              }
            }
          }}
        />
      </div>
    )
  }

  return (
    <div
      className={
        dark
          ? 'dark'
          : ''
      }
      style={{
        height:
          '100%',
      }}
    >
      <div className="h-full flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">

        <aside
          className={`flex flex-col flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ${
            sidebarCollapsed
              ? 'w-16'
              : 'w-60'
          }`}
        >
          <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">

            <button
              type="button"
              aria-label={
                sidebarCollapsed
                  ? 'Expand sidebar'
                  : 'Collapse sidebar'
              }
              title={
                sidebarCollapsed
                  ? 'Expand sidebar'
                  : 'Collapse sidebar'
              }
              className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0"
              onClick={() =>
                setSidebarCollapsed(
                  value =>
                    !value
                )
              }
            >
              <CalendarDays
                size={15}
                className="text-white"
              />
            </button>

            {!sidebarCollapsed && (
              <span className="font-display font-700 text-base text-slate-900 dark:text-white whitespace-nowrap">
                My Scheduler
              </span>
            )}

          </div>

          <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">

            {NAV_ITEMS.map(
              item => {
                const active =
                  view ===
                  item.id

                return (
                  <button
                    type="button"
                    key={
                      item.id
                    }
                    onClick={() =>
                      navigateTo(
                        item.id
                      )
                    }
                    title={
                      sidebarCollapsed
                        ? item.label
                        : undefined
                    }
                    aria-label={
                      item.label
                    }
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                      active
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <item.icon
                      size={17}
                      className={`flex-shrink-0 ${
                        active
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                      }`}
                    />

                    {!sidebarCollapsed && (
                      <span>
                        {
                          item.label
                        }
                      </span>
                    )}

                    {active &&
                      !sidebarCollapsed && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                      )}

                  </button>
                )
              }
            )}

          </nav>

          <div className="px-2 py-3 border-t border-slate-100 dark:border-slate-800 space-y-0.5">

            <button
              type="button"
              onClick={() =>
                setUtilityPanel(
                  'settings'
                )
              }
              title={
                sidebarCollapsed
                  ? 'Settings'
                  : undefined
              }
              aria-label="Settings"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <Settings
                size={17}
                className="flex-shrink-0"
              />

              {!sidebarCollapsed && (
                <span>
                  Settings
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                setUtilityPanel(
                  'help'
                )
              }
              title={
                sidebarCollapsed
                  ? 'Help'
                  : undefined
              }
              aria-label="Help"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <HelpCircle
                size={17}
                className="flex-shrink-0"
              />

              {!sidebarCollapsed && (
                <span>
                  Help
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={
                openProfilePanel
              }
              title={
                sidebarCollapsed
                  ? userProfile?.name ||
                    'Profile'
                  : undefined
              }
              aria-label="Profile"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left ${
                sidebarCollapsed
                  ? 'justify-center'
                  : ''
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center flex-shrink-0">

                <User
                  size={13}
                  className="text-white"
                />

              </div>

              {!sidebarCollapsed && (
                <div className="min-w-0">

                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {userProfile?.name ||
                      'Student'}
                  </p>

                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                    {userProfile?.semester ||
                      'Semester not set'}
                  </p>

                </div>
              )}

            </button>

          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">

          <header className="h-16 flex items-center gap-4 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 relative z-30">

            <div className="flex-1 max-w-sm relative">

              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />

              <input
                value={
                  searchValue
                }
                onFocus={() =>
                  setSearchFocused(
                    true
                  )
                }
                onChange={
                  e => {
                    setSearchValue(
                      e.target.value
                    )

                    setSearchFocused(
                      true
                    )
                  }
                }
                placeholder="Search tasks, subjects, events..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-9 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />

              {searchValue && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearchValue(
                      ''
                    )

                    setSearchFocused(
                      false
                    )
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X
                    size={14}
                  />
                </button>
              )}

              {searchFocused &&
                searchValue.trim() && (
                <div className="absolute left-0 right-0 top-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden z-50">

                  {searchResults.length >
                  0 ? (
                    <div className="py-1 max-h-80 overflow-y-auto">

                      {searchResults.map(
                        result => (
                          <button
                            type="button"
                            key={
                              result.id
                            }
                            onClick={() =>
                              navigateTo(
                                result.view
                              )
                            }
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">

                              <SearchResultIcon
                                type={
                                  result.type
                                }
                              />

                            </div>

                            <div className="min-w-0">

                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                {
                                  result.title
                                }
                              </p>

                              <p className="text-xs text-slate-400 truncate">
                                {
                                  result.subtitle
                                }
                              </p>

                            </div>
                          </button>
                        )
                      )}

                    </div>
                  ) : (
                    <div className="px-4 py-5 text-center">

                      <Search
                        size={20}
                        className="mx-auto text-slate-300 dark:text-slate-600 mb-2"
                      />

                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        No results found
                      </p>

                      <p className="text-xs text-slate-400 mt-1">
                        Try another task, subject, assessment or event name.
                      </p>

                    </div>
                  )}

                </div>
              )}

            </div>

            <div className="ml-auto flex items-center gap-2">

              <button
                type="button"
                onClick={() =>
                  setShowQuickAdd(
                    true
                  )
                }
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                <Plus
                  size={15}
                />

                <span className="hidden sm:block">
                  Add
                </span>
              </button>

              <div className="relative">

                <button
                  type="button"
                  onClick={() =>
                    setShowNotifications(
                      value =>
                        !value
                    )
                  }
                  className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                >
                  <Bell
                    size={17}
                  />

                  {actionableNotificationCount >
                    0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-500 text-white rounded-full flex items-center justify-center font-bold"
                      style={{
                        fontSize:
                          9,
                      }}
                    >
                      {
                        actionableNotificationCount
                      }
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden">

                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">

                      <div>

                        <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                          Notifications
                        </h4>

                        <p className="text-xs text-slate-400 mt-0.5">
                          Based on your current schedule
                        </p>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setShowNotifications(
                            false
                          )
                        }
                        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                      >
                        <X
                          size={13}
                        />
                      </button>

                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">

                      {notifications.map(
                        notification => (
                          <div
                            key={
                              notification.id
                            }
                            className="flex items-start gap-3 px-4 py-3"
                          >
                            <NotifIcon
                              type={
                                notification.type
                              }
                            />

                            <div className="flex-1 min-w-0">

                              <p className="text-xs text-slate-700 dark:text-slate-300">
                                {
                                  notification.message
                                }
                              </p>

                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                {
                                  notification.time
                                }
                              </p>

                            </div>
                          </div>
                        )
                      )}

                    </div>

                  </div>
                )}

              </div>

              <button
                type="button"
                onClick={
                  toggleDarkMode
                }
                title={
                  dark
                    ? 'Use light mode'
                    : 'Use dark mode'
                }
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
              >
                {dark ? (
                  <Sun
                    size={17}
                  />
                ) : (
                  <Moon
                    size={17}
                  />
                )}
              </button>

            </div>
          </header>

          <main className="flex-1 overflow-y-auto">

            {view ===
              'dashboard' && (
              <Dashboard
                userProfile={
                  userProfile
                }
                onNavigate={
                  navigateTo
                }
                onQuickAdd={() =>
                  setShowQuickAdd(
                    true
                  )
                }
              />
            )}

            {view ===
              'myday' && (
              <MyDay
                userProfile={
                  userProfile
                }
              />
            )}

            {view ===
              'calendar' && (
              <CalendarView
                userProfile={
                  userProfile
                }
              />
            )}

            {view ===
              'academics' && (
              <AcademicsView
                userProfile={
                  userProfile
                }
              />
            )}

            {view ===
              'tasks' && (
              <TasksView />
            )}

            {view ===
              'focus' && (
              <FocusView />
            )}

            {view ===
              'progress' && (
              <ProgressView />
            )}

          </main>

        </div>
      </div>

      {showQuickAdd && (
        <QuickAddModal
          onClose={() =>
            setShowQuickAdd(
              false
            )
          }
          onTaskAdded={() =>
            setTaskRefreshKey(
              value =>
                value +
                1
            )
          }
        />
      )}

      {showNotifications && (
        <div
          className="fixed inset-0 z-20"
          onClick={() =>
            setShowNotifications(
              false
            )
          }
        />
      )}

      {searchFocused &&
        searchValue.trim() && (
        <div
          className="fixed inset-0 z-20"
          onClick={() =>
            setSearchFocused(
              false
            )
          }
        />
      )}

      {utilityPanel && (
        <div className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">

            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">

              <div className="flex items-center gap-3">

                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">

                  {utilityPanel ===
                    'settings' && (
                    <Settings
                      size={18}
                    />
                  )}

                  {utilityPanel ===
                    'help' && (
                    <HelpCircle
                      size={18}
                    />
                  )}

                  {utilityPanel ===
                    'profile' && (
                    <User
                      size={18}
                    />
                  )}

                </div>

                <div>

                  <h3 className="font-display font-700 text-lg text-slate-900 dark:text-white">
                    {utilityPanel ===
                    'settings'
                      ? 'Settings'
                      : utilityPanel ===
                          'help'
                        ? 'Help'
                        : 'Profile'}
                  </h3>

                  <p className="text-xs text-slate-400">
                    {utilityPanel ===
                    'settings'
                      ? 'Adjust your app preferences.'
                      : utilityPanel ===
                          'help'
                        ? 'A quick guide to My Scheduler.'
                        : 'Your current scheduler profile.'}
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setUtilityPanel(
                    null
                  )
                }
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X
                  size={15}
                />
              </button>

            </div>

            <div className="p-6 overflow-y-auto">

              {utilityPanel ===
                'settings' && (
                <div className="space-y-4">

                  <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">

                    <div>

                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Dark mode
                      </p>

                      <p className="text-xs text-slate-400 mt-0.5">
                        Your choice is remembered after refresh.
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={
                        toggleDarkMode
                      }
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        dark
                          ? 'bg-indigo-600'
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${
                          dark
                            ? 'left-6'
                            : 'left-1'
                        }`}
                      />
                    </button>

                  </div>

                  <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">

                    <div>

                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Sidebar
                      </p>

                      <p className="text-xs text-slate-400 mt-0.5">
                        Expand or collapse the navigation area.
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSidebarCollapsed(
                          value =>
                            !value
                        )
                      }
                      className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-indigo-600 dark:text-indigo-400"
                    >
                      {sidebarCollapsed
                        ? 'Expand'
                        : 'Collapse'}
                    </button>

                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">

                    <div className="flex items-start justify-between gap-4 mb-4">

                      <div>

                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          Calendar colors
                        </p>

                        <p className="text-xs text-slate-400 mt-0.5">
                          Choose the color used for each calendar category.
                        </p>

                        <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">
                          {loadingPreferences
                            ? 'Loading your saved colors...'
                            : savingPreference
                              ? 'Saving color...'
                              : 'Colors are saved to your account automatically.'}
                        </p>

                      </div>

                      <button
                        type="button"
                        onClick={
                          resetCalendarColors
                        }
                        disabled={
                          loadingPreferences ||
                          savingPreference !==
                            null
                        }
                        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Reset
                      </button>

                    </div>

                    <div className="space-y-3">

                      {CALENDAR_COLOR_OPTIONS.map(
                        option => (
                          <div
                            key={
                              option.key
                            }
                            className="flex items-center justify-between gap-4"
                          >

                            <div className="flex items-center gap-3">

                              <span
                                className="w-4 h-4 rounded-full border border-black/10 dark:border-white/10"
                                style={{
                                  backgroundColor:
                                    calendarColors[
                                      option.key
                                    ],
                                }}
                              />

                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {
                                  option.label
                                }
                              </span>

                            </div>

                            <input
                              type="color"
                              value={
                                calendarColors[
                                  option.key
                                ]
                              }
                              disabled={
                                loadingPreferences ||
                                savingPreference !==
                                  null
                              }
                              onChange={
                                e =>
                                  updateCalendarColor(
                                    option.key,
                                    e.target.value
                                  )
                              }
                              aria-label={`${option.label} color`}
                              className="w-12 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent cursor-pointer p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            />

                          </div>
                        )
                      )}

                    </div>

                    <p className="text-xs text-slate-400 mt-4">
                      These preferences follow your signed-in account.
                    </p>

                  </div>

                </div>
              )}

              {utilityPanel ===
                'help' && (
                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">

                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">

                    <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      My Day
                    </p>

                    <p>
                      Use Auto Plan to fit unfinished tasks around classes, routines and your study plan.
                    </p>

                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">

                    <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      Academics
                    </p>

                    <p>
                      Track subjects, assessments, preparation topics and generate your study plan.
                    </p>

                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">

                    <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      Focus
                    </p>

                    <p>
                      Run timed focus sessions and have completed sessions counted in Progress.
                    </p>

                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">

                    <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      Search
                    </p>

                    <p>
                      Search for tasks, subjects, assessments and calendar events from the bar at the top.
                    </p>

                  </div>

                </div>
              )}

              {utilityPanel ===
                'profile' && (
                <div className="space-y-5">

                  <div className="flex items-center gap-4">

                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">

                      <User
                        size={24}
                        className="text-white"
                      />

                    </div>

                    <div className="min-w-0">

                      <h4 className="font-display font-700 text-xl text-slate-900 dark:text-white truncate">
                        {userProfile?.name ||
                          'Student'}
                      </h4>

                      <p className="text-sm text-slate-400 truncate">
                        {userProfile?.university ||
                          'University not set'}
                      </p>

                    </div>

                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-5">

                    <div className="mb-4">

                      <h5 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Profile & Goals
                      </h5>

                      <p className="text-xs text-slate-400 mt-1">
                        Update the information you entered during onboarding.
                      </p>

                    </div>

                    <div className="space-y-4">

                      <div>

                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                          Full name
                        </label>

                        <input
                          type="text"
                          value={
                            profileName
                          }
                          disabled={
                            savingProfile
                          }
                          onChange={
                            event => {
                              setProfileName(
                                event.target.value
                              )

                              setProfileSaveError(
                                ''
                              )

                              setProfileSaveSuccess(
                                false
                              )
                            }
                          }
                          placeholder="Your name"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />

                      </div>

                      <div>

                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                          University
                        </label>

                        <input
                          type="text"
                          value={
                            profileUniversity
                          }
                          disabled={
                            savingProfile
                          }
                          onChange={
                            event => {
                              setProfileUniversity(
                                event.target.value
                              )

                              setProfileSaveError(
                                ''
                              )

                              setProfileSaveSuccess(
                                false
                              )
                            }
                          }
                          placeholder="Your university"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />

                      </div>

                      <div>

                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                          Semester / Academic level
                        </label>

                        <input
                          type="text"
                          value={
                            profileSemester
                          }
                          disabled={
                            savingProfile
                          }
                          onChange={
                            event => {
                              setProfileSemester(
                                event.target.value
                              )

                              setProfileSaveError(
                                ''
                              )

                              setProfileSaveSuccess(
                                false
                              )
                            }
                          }
                          placeholder="e.g. Semester 1, Final year"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />

                      </div>

                      <div className="grid grid-cols-2 gap-3">

                        <div>

                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                            Wake-up time
                          </label>

                          <input
                            type="time"
                            value={
                              profileWakeUpTime
                            }
                            disabled={
                              savingProfile
                            }
                            onChange={
                              event => {
                                setProfileWakeUpTime(
                                  event.target.value
                                )

                                setProfileSaveError(
                                  ''
                                )

                                setProfileSaveSuccess(
                                  false
                                )
                              }
                            }
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />

                        </div>

                        <div>

                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                            Bedtime
                          </label>

                          <input
                            type="time"
                            value={
                              profileBedtime
                            }
                            disabled={
                              savingProfile
                            }
                            onChange={
                              event => {
                                setProfileBedtime(
                                  event.target.value
                                )

                                setProfileSaveError(
                                  ''
                                )

                                setProfileSaveSuccess(
                                  false
                                )
                              }
                            }
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />

                        </div>

                      </div>

                      <div className="grid grid-cols-2 gap-3">

                        <div>

                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                            Study hours / week
                          </label>

                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={
                              profileStudyHours
                            }
                            disabled={
                              savingProfile
                            }
                            onChange={
                              event => {
                                setProfileStudyHours(
                                  event.target.value
                                )

                                setProfileSaveError(
                                  ''
                                )

                                setProfileSaveSuccess(
                                  false
                                )
                              }
                            }
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />

                        </div>

                        <div>

                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                            Exercise days / week
                          </label>

                          <input
                            type="number"
                            min={0}
                            max={7}
                            step={1}
                            value={
                              profileExerciseDays
                            }
                            disabled={
                              savingProfile
                            }
                            onChange={
                              event => {
                                setProfileExerciseDays(
                                  event.target.value
                                )

                                setProfileSaveError(
                                  ''
                                )

                                setProfileSaveSuccess(
                                  false
                                )
                              }
                            }
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />

                        </div>

                      </div>

                      {profileSaveError && (
                        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2.5">

                          <p className="text-xs text-red-600 dark:text-red-400">
                            {
                              profileSaveError
                            }
                          </p>

                        </div>
                      )}

                      {profileSaveSuccess && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl px-3 py-2.5">

                          <p className="text-xs text-emerald-700 dark:text-emerald-400">
                            Profile saved successfully.
                          </p>

                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          void saveProfileChanges()
                        }
                        disabled={
                          savingProfile
                        }
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >

                        {savingProfile && (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        )}

                        {savingProfile
                          ? 'Saving profile...'
                          : 'Save Profile & Goals'}

                      </button>

                    </div>

                  </div>

                  <div className="grid grid-cols-2 gap-3">

                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">

                      <p className="text-xs text-slate-400 mb-1">
                        Subjects
                      </p>

                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {userProfile?.subjects.length ??
                          0}
                      </p>

                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">

                      <p className="text-xs text-slate-400 mb-1">
                        Classes
                      </p>

                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {userProfile?.classes.length ??
                          0}
                      </p>

                    </div>

                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">

                    <button
                      type="button"
                      onClick={
                        handleSignOut
                      }
                      disabled={
                        signingOut ||
                        savingProfile
                      }
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >

                      {signingOut ? (
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                      ) : (
                        <LogOut
                          size={16}
                        />
                      )}

                      {signingOut
                        ? 'Signing out...'
                        : 'Sign out'}

                    </button>

                    <p className="text-xs text-slate-400 mt-2 text-center">
                      Your scheduler data remains safely stored in your account.
                    </p>

                  </div>

                </div>
              )}
            </div>

            {utilityPanel !==
              'profile' && (
              <div className="px-6 pb-6">

                <button
                  type="button"
                  onClick={() =>
                    setUtilityPanel(
                      null
                    )
                  }
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors"
                >
                  Done
                </button>

              </div>
            )}

          </div>

        </div>
      )}

    </div>
  )
}