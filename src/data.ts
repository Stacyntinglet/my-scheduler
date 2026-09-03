import type { TimelineItem, Task, Subject, Assessment, AppNotification } from './types'

export const timeline: TimelineItem[] = [
  {
    id: '1', startHour: 8, startMin: 0, endHour: 10, endMin: 0,
    title: 'Database Systems', subtitle: 'Class · Room A201',
    category: 'class', status: 'completed', isFixed: true,
  },
  {
    id: '2', startHour: 10, startMin: 0, endHour: 11, endMin: 0,
    title: 'Free Time', subtitle: '1 hour available',
    category: 'free', status: 'completed', isFixed: false,
  },
  {
    id: '3', startHour: 11, startMin: 0, endHour: 12, endMin: 30,
    title: 'Mathematics', subtitle: 'Tutorial · Room B104',
    category: 'class', status: 'completed', isFixed: true,
  },
  {
    id: '4', startHour: 13, startMin: 0, endHour: 14, endMin: 0,
    title: 'Lunch', subtitle: 'Break',
    category: 'meal', status: 'current', isFixed: false,
  },
  {
    id: '5', startHour: 14, startMin: 0, endHour: 14, endMin: 45,
    title: 'Physics Revision', subtitle: 'Study · 45 min',
    category: 'study', status: 'upcoming', isFixed: false,
  },
  {
    id: '6', startHour: 16, startMin: 0, endHour: 17, endMin: 0,
    title: 'Programming Lecture', subtitle: 'Class · Room C301',
    category: 'class', status: 'upcoming', isFixed: true,
  },
  {
    id: '7', startHour: 17, startMin: 30, endHour: 18, endMin: 30,
    title: 'Gym', subtitle: 'Personal · Fitness Center',
    category: 'personal', status: 'upcoming', isFixed: false,
  },
  {
    id: '8', startHour: 18, startMin: 30, endHour: 19, endMin: 0,
    title: 'Grocery Shopping', subtitle: 'Task',
    category: 'task', status: 'flexible', isFixed: false,
  },
]

export const tasks: Task[] = [
  {
    id: '1', title: 'Finish Database Assignment', subject: 'Database Systems',
    dueDate: 'Tomorrow', daysUntilDue: 1, duration: '1 hour',
    priority: 'high', completed: false,
  },
  {
    id: '2', title: 'Complete Programming Lab Report', subject: 'Programming',
    dueDate: 'In 3 days', daysUntilDue: 3, duration: '2 hours',
    priority: 'high', completed: false,
  },
  {
    id: '3', title: 'Review Calculus Integration', subject: 'Mathematics',
    dueDate: 'Today', daysUntilDue: 0, duration: '45 min',
    priority: 'medium', completed: false,
  },
  {
    id: '4', title: 'Read Networking Chapter 5', subject: 'Networking',
    dueDate: 'In 5 days', daysUntilDue: 5, duration: '1 hour',
    priority: 'low', completed: false,
  },
  {
    id: '5', title: 'Physics Problem Set', subject: 'Physics',
    dueDate: 'In 2 days', daysUntilDue: 2, duration: '1.5 hours',
    priority: 'medium', completed: false,
  },
  {
    id: '6', title: 'Grocery Shopping', subject: 'Personal',
    dueDate: 'Today', daysUntilDue: 0, duration: '30 min',
    priority: 'medium', completed: false,
  },
  {
    id: '7', title: 'SQL Tutorial Exercises', subject: 'Database Systems',
    dueDate: 'Yesterday', daysUntilDue: -1, duration: '45 min',
    priority: 'high', completed: true,
  },
  {
    id: '8', title: 'Physics Lab Pre-reading', subject: 'Physics',
    dueDate: '3 days ago', daysUntilDue: -3, duration: '30 min',
    priority: 'medium', completed: true,
  },
]

export const subjects: Subject[] = [
  {
    id: '1', name: 'Database Systems',
    dotColor: 'bg-indigo-500', bgLight: 'bg-indigo-50 dark:bg-indigo-950/50',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    nextClass: 'Tomorrow · 8:00 AM', nextAssessment: 'CA · 5 days', studyProgress: 65,
  },
  {
    id: '2', name: 'Mathematics',
    dotColor: 'bg-violet-500', bgLight: 'bg-violet-50 dark:bg-violet-950/50',
    textColor: 'text-violet-600 dark:text-violet-400',
    nextClass: 'Wednesday · 11:00 AM', nextAssessment: 'Test · 12 days', studyProgress: 48,
  },
  {
    id: '3', name: 'Programming',
    dotColor: 'bg-blue-500', bgLight: 'bg-blue-50 dark:bg-blue-950/50',
    textColor: 'text-blue-600 dark:text-blue-400',
    nextClass: 'Today · 4:00 PM', nextAssessment: 'Project · 18 days', studyProgress: 72,
  },
  {
    id: '4', name: 'Physics',
    dotColor: 'bg-cyan-500', bgLight: 'bg-cyan-50 dark:bg-cyan-950/50',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    nextClass: 'Thursday · 9:00 AM', nextAssessment: 'Exam · 18 days', studyProgress: 35,
  },
  {
    id: '5', name: 'Networking',
    dotColor: 'bg-emerald-500', bgLight: 'bg-emerald-50 dark:bg-emerald-950/50',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    nextClass: 'Friday · 2:00 PM', nextAssessment: 'Assignment · 7 days', studyProgress: 55,
  },
]

export const assessments: Assessment[] = [
  {
    id: '1', subject: 'Database Systems', dotColor: 'bg-indigo-500',
    type: 'CA 1', daysLeft: 5,
    topics: [
      { name: 'ER Diagrams', done: true },
      { name: 'SQL Basics', done: true },
      { name: 'Normalization', done: false },
      { name: 'Transactions', done: false },
    ],
    progress: 65,
  },
  {
    id: '2', subject: 'Mathematics', dotColor: 'bg-violet-500',
    type: 'Test', daysLeft: 12,
    topics: [
      { name: 'Differentiation', done: true },
      { name: 'Integration', done: false },
      { name: 'Differential Equations', done: false },
    ],
    progress: 48,
  },
  {
    id: '3', subject: 'Physics', dotColor: 'bg-cyan-500',
    type: 'Exam', daysLeft: 18,
    topics: [
      { name: 'Mechanics', done: true },
      { name: 'Thermodynamics', done: false },
      { name: 'Electromagnetism', done: false },
      { name: 'Optics', done: false },
    ],
    progress: 35,
  },
]

export const notifications: AppNotification[] = [
  {
    id: '1', message: 'Database Systems CA is in 5 days.',
    type: 'warning', time: '2m ago',
  },
  {
    id: '2', message: "You haven't studied Calculus in 4 days.",
    type: 'reminder', time: '1h ago',
  },
  {
    id: '3', message: 'You have 90 minutes free before your next class. Want to schedule something?',
    type: 'info', time: '2h ago',
  },
  {
    id: '4', message: 'Programming Assignment is due tomorrow.',
    type: 'warning', time: '3h ago',
  },
  {
    id: '5', message: 'Your afternoon is getting crowded. Consider moving your gym session to 6:00 PM.',
    type: 'info', time: '4h ago',
  },
]

export const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const weekDates = [24, 25, 26, 27, 28, 29, 30]

export const calendarEvents: { day: number; startHour: number; endHour: number; title: string; color: string }[] = [
  { day: 0, startHour: 8, endHour: 10, title: 'Database Systems', color: 'bg-indigo-500' },
  { day: 0, startHour: 11, endHour: 12.5, title: 'Mathematics Tutorial', color: 'bg-violet-500' },
  { day: 0, startHour: 16, endHour: 17, title: 'Programming Lecture', color: 'bg-blue-500' },
  { day: 1, startHour: 9, endHour: 10, title: 'Physics Lab', color: 'bg-cyan-500' },
  { day: 1, startHour: 14, endHour: 15, title: 'Study: DB Normalization', color: 'bg-purple-400' },
  { day: 2, startHour: 8, endHour: 10, title: 'Database Systems', color: 'bg-indigo-500' },
  { day: 2, startHour: 11, endHour: 12.5, title: 'Mathematics Tutorial', color: 'bg-violet-500' },
  { day: 2, startHour: 15, endHour: 16, title: 'Doctor Appointment', color: 'bg-rose-400' },
  { day: 3, startHour: 9, endHour: 10, title: 'Physics', color: 'bg-cyan-500' },
  { day: 3, startHour: 14, endHour: 15.5, title: 'Networking', color: 'bg-emerald-500' },
  { day: 4, startHour: 10, endHour: 12, title: 'Programming', color: 'bg-blue-500' },
  { day: 4, startHour: 17, endHour: 18, title: 'Gym', color: 'bg-orange-400' },
]
