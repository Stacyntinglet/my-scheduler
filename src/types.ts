export type View =
  | 'dashboard'
  | 'myday'
  | 'calendar'
  | 'academics'
  | 'tasks'
  | 'focus'
  | 'progress'

export interface TimelineItem {
  id: string
  startHour: number
  startMin: number
  endHour: number
  endMin: number
  title: string
  subtitle: string
  category: 'class' | 'study' | 'personal' | 'task' | 'free' | 'meal'
  status: 'completed' | 'current' | 'upcoming' | 'flexible' | 'suggested'
  isFixed: boolean
}

export interface Task {
  id: string
  title: string
  subject: string
  dueDate: string
  daysUntilDue: number
  duration: string
  priority: 'high' | 'medium' | 'low'
  completed: boolean
}

export interface Subject {
  id: string
  name: string
  dotColor: string
  bgLight: string
  textColor: string
  nextClass: string
  nextAssessment: string
  studyProgress: number
}

export interface Assessment {
  id: string
  subject: string
  dotColor: string
  type: string
  daysLeft: number
  topics: {
    name: string
    done: boolean
  }[]
  progress: number
}

export interface AppNotification {
  id: string
  message: string
  type: 'warning' | 'info' | 'reminder'
  time: string
}

export interface ClassScheduleItem {
  id: string
  day: string
  subject: string
  startTime: string
  endTime: string
  venue: string
  lecturer: string
}

export type StudyPeriod =
  | 'morning'
  | 'afternoon'
  | 'evening'

export interface StudyPreference {
  period: StudyPeriod
  startTime: string
  endTime: string
}

export type RoutineType =
  | 'fixed'
  | 'flexible'

export interface RoutineItem {
  id: string
  name: string
  type: RoutineType

  // Used for fixed recurring routines
  days: string[]

  // Used when type === 'fixed'
  startTime?: string
  endTime?: string

  // Used when type === 'flexible'
  durationMinutes?: number
}

export interface UserProfile {
  name: string
  university: string
  semester: string
  wakeUpTime: string
  bedtime: string

  subjects: string[]
  classes: ClassScheduleItem[]

  routines: RoutineItem[]

  studyHoursPerWeek: number
  exerciseDaysPerWeek: number
  studyPreferences: StudyPreference[]
}