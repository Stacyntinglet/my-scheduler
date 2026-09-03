import { useState } from 'react'
import { createId } from '../utils/createId'

import type {
  UserProfile,
  ClassScheduleItem,
  StudyPreference,
  RoutineItem,
  RoutineType,
} from '../types'

import {
  CalendarDays,
  Plus,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  Trash2,
  Clock,
  Lock,
  Shuffle,
  MapPin,
  UserRound,
} from 'lucide-react'

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void
}

const STEPS = [
  'About You',
  'Academics',
  'Routine',
  'Goals',
  'Ready',
]

const SUBJECT_COLORS = [
  'bg-indigo-500',
  'bg-violet-500',
  'bg-blue-500',
  'bg-cyan-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-pink-500',
]

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

const ROUTINE_SUGGESTIONS = [
  'Gym',
  'Church',
  'Work',
  'Cleaning',
  'Grocery Shopping',
  'Clubs',
  'Sports',
  'Meal Prep',
]

const HOURS = [
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '12',
]

const MINUTES = [
  '00',
  '05',
  '10',
  '15',
  '20',
  '25',
  '30',
  '35',
  '40',
  '45',
  '50',
  '55',
]

type Meridiem = 'AM' | 'PM'

function convertTo24Hour(
  hour: string,
  minute: string,
  meridiem: Meridiem
) {
  let numericHour = Number(hour)

  if (
    meridiem === 'AM' &&
    numericHour === 12
  ) {
    numericHour = 0
  }

  if (
    meridiem === 'PM' &&
    numericHour !== 12
  ) {
    numericHour += 12
  }

  return `${String(
    numericHour
  ).padStart(2, '0')}:${minute}`
}

function format24HourTime(
  time: string
) {
  if (!time) return ''

  const [hourString, minute] =
    time.split(':')

  const hour =
    Number(hourString)

  const meridiem =
    hour >= 12
      ? 'PM'
      : 'AM'

  const displayHour =
    hour % 12 || 12

  return `${displayHour}:${minute} ${meridiem}`
}

interface TimePickerProps {
  label: string
  hour: string
  minute: string
  meridiem: Meridiem
  onHourChange: (value: string) => void
  onMinuteChange: (value: string) => void
  onMeridiemChange: (
    value: Meridiem
  ) => void
}

function TimePicker({
  label,
  hour,
  minute,
  meridiem,
  onHourChange,
  onMinuteChange,
  onMeridiemChange,
}: TimePickerProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
        {label}
      </label>

      <div className="grid grid-cols-3 gap-2">
        <select
          value={hour}
          onChange={e =>
            onHourChange(
              e.target.value
            )
          }
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {HOURS.map(
            value => (
              <option
                key={value}
                value={value}
              >
                {value}
              </option>
            )
          )}
        </select>

        <select
          value={minute}
          onChange={e =>
            onMinuteChange(
              e.target.value
            )
          }
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {MINUTES.map(
            value => (
              <option
                key={value}
                value={value}
              >
                {value}
              </option>
            )
          )}
        </select>

        <select
          value={meridiem}
          onChange={e =>
            onMeridiemChange(
              e.target
                .value as Meridiem
            )
          }
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="AM">
            AM
          </option>

          <option value="PM">
            PM
          </option>
        </select>
      </div>
    </div>
  )
}

export default function Onboarding({
  onComplete,
}: OnboardingProps) {
  const [step, setStep] =
    useState(0)

  // ABOUT YOU
  const [name, setName] =
    useState('')

  const [
    university,
    setUniversity,
  ] =
    useState('')

  const [
    semester,
    setSemester,
  ] =
    useState('')

  const [
    wakeHour,
    setWakeHour,
  ] =
    useState('06')

  const [
    wakeMinute,
    setWakeMinute,
  ] =
    useState('30')

  const [
    wakeMeridiem,
    setWakeMeridiem,
  ] =
    useState<Meridiem>('AM')

  const [
    bedHour,
    setBedHour,
  ] =
    useState('11')

  const [
    bedMinute,
    setBedMinute,
  ] =
    useState('00')

  const [
    bedMeridiem,
    setBedMeridiem,
  ] =
    useState<Meridiem>('PM')

  // ACADEMICS
  const [
    subjects,
    setSubjects,
  ] =
    useState<string[]>([])

  const [
    newSubject,
    setNewSubject,
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
    useState('10:00')

  // NEW CLASS DETAILS
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

  // ROUTINES
  const [
    routines,
    setRoutines,
  ] =
    useState<RoutineItem[]>([])

  const [
    routineName,
    setRoutineName,
  ] =
    useState('')

  const [
    routineType,
    setRoutineType,
  ] =
    useState<RoutineType>(
      'fixed'
    )

  const [
    routineDays,
    setRoutineDays,
  ] =
    useState<string[]>([])

  const [
    routineStartTime,
    setRoutineStartTime,
  ] =
    useState('17:00')

  const [
    routineEndTime,
    setRoutineEndTime,
  ] =
    useState('18:00')

  const [
    routineDuration,
    setRoutineDuration,
  ] =
    useState(60)

  // GOALS
  const [
    studyHours,
    setStudyHours,
  ] =
    useState(15)

  const [
    exerciseDays,
    setExerciseDays,
  ] =
    useState(3)

  const [
    morningEnabled,
    setMorningEnabled,
  ] =
    useState(false)

  const [
    morningStart,
    setMorningStart,
  ] =
    useState('06:00')

  const [
    morningEnd,
    setMorningEnd,
  ] =
    useState('10:00')

  const [
    afternoonEnabled,
    setAfternoonEnabled,
  ] =
    useState(false)

  const [
    afternoonStart,
    setAfternoonStart,
  ] =
    useState('12:00')

  const [
    afternoonEnd,
    setAfternoonEnd,
  ] =
    useState('16:00')

  const [
    eveningEnabled,
    setEveningEnabled,
  ] =
    useState(false)

  const [
    eveningStart,
    setEveningStart,
  ] =
    useState('18:00')

  const [
    eveningEnd,
    setEveningEnd,
  ] =
    useState('22:00')

  // SUBJECT FUNCTIONS
  const addSubject = () => {
    const trimmed =
      newSubject.trim()

    if (!trimmed) return

    if (
      !subjects.includes(
        trimmed
      )
    ) {
      setSubjects(
        prev => [
          ...prev,
          trimmed,
        ]
      )

      if (!classSubject) {
        setClassSubject(
          trimmed
        )
      }
    }

    setNewSubject('')
  }

  const removeSubject = (
    index: number
  ) => {
    const subjectToRemove =
      subjects[index]

    const remaining =
      subjects.filter(
        (_, idx) =>
          idx !== index
      )

    setSubjects(
      remaining
    )

    setClasses(
      prev =>
        prev.filter(
          item =>
            item.subject !==
            subjectToRemove
        )
    )

    if (
      classSubject ===
      subjectToRemove
    ) {
      setClassSubject(
        remaining[0] ||
          ''
      )
    }
  }

  // CLASS FUNCTIONS
  const addClass = () => {
    if (
      !classDay ||
      !classSubject ||
      !classStartTime ||
      !classEndTime ||
      !classVenue.trim() ||
      !classLecturer.trim()
    ) {
      alert(
        'Please complete all class fields, including venue and lecturer.'
      )
      return
    }

    if (
      classEndTime <=
      classStartTime
    ) {
      alert(
        'Class end time must be later than the start time.'
      )
      return
    }

    const newClass:
      ClassScheduleItem = {
      id: createId(),
      day: classDay,
      subject:
        classSubject,
      startTime:
        classStartTime,
      endTime:
        classEndTime,
      venue:
        classVenue.trim(),
      lecturer:
        classLecturer.trim(),
    }

    setClasses(
      prev => [
        ...prev,
        newClass,
      ]
    )

    /*
     * Keep day, subject and default
     * times convenient for adding
     * another class, but clear the
     * descriptive information.
     */
    setClassVenue('')
    setClassLecturer('')
  }

  const removeClass = (
    id: string
  ) => {
    setClasses(
      prev =>
        prev.filter(
          item =>
            item.id !== id
        )
    )
  }

  // ROUTINE FUNCTIONS
  const toggleRoutineDay = (
    day: string
  ) => {
    setRoutineDays(
      prev =>
        prev.includes(day)
          ? prev.filter(
              item =>
                item !== day
            )
          : [
              ...prev,
              day,
            ]
    )
  }

  const addRoutine = () => {
    const trimmedName =
      routineName.trim()

    if (!trimmedName) {
      alert(
        'Enter a routine name.'
      )
      return
    }

    if (
      routineType ===
      'fixed'
    ) {
      if (
        routineDays.length ===
        0
      ) {
        alert(
          'Choose at least one day for this fixed routine.'
        )
        return
      }

      if (
        routineEndTime <=
        routineStartTime
      ) {
        alert(
          'Routine end time must be later than the start time.'
        )
        return
      }
    }

    const newRoutine:
      RoutineItem =
      routineType ===
      'fixed'
        ? {
            id: createId(),
            name:
              trimmedName,
            type:
              'fixed',
            days:
              routineDays,
            startTime:
              routineStartTime,
            endTime:
              routineEndTime,
          }
        : {
            id: createId(),
            name:
              trimmedName,
            type:
              'flexible',
            days: [],
            durationMinutes:
              routineDuration,
          }

    setRoutines(
      prev => [
        ...prev,
        newRoutine,
      ]
    )

    setRoutineName('')
    setRoutineDays([])
    setRoutineType('fixed')
    setRoutineStartTime(
      '17:00'
    )
    setRoutineEndTime(
      '18:00'
    )
    setRoutineDuration(60)
  }

  const removeRoutine = (
    id: string
  ) => {
    setRoutines(
      prev =>
        prev.filter(
          item =>
            item.id !== id
        )
    )
  }

  // STUDY PREFERENCES
  const buildStudyPreferences =
    (): StudyPreference[] => {
      const preferences:
        StudyPreference[] =
        []

      if (
        morningEnabled
      ) {
        preferences.push({
          period:
            'morning',
          startTime:
            morningStart,
          endTime:
            morningEnd,
        })
      }

      if (
        afternoonEnabled
      ) {
        preferences.push({
          period:
            'afternoon',
          startTime:
            afternoonStart,
          endTime:
            afternoonEnd,
        })
      }

      if (
        eveningEnabled
      ) {
        preferences.push({
          period:
            'evening',
          startTime:
            eveningStart,
          endTime:
            eveningEnd,
        })
      }

      return preferences
    }

  const finishOnboarding =
    () => {
      const wakeUpTime =
        convertTo24Hour(
          wakeHour,
          wakeMinute,
          wakeMeridiem
        )

      const bedtime =
        convertTo24Hour(
          bedHour,
          bedMinute,
          bedMeridiem
        )

      const studyPreferences =
        buildStudyPreferences()

      onComplete({
        name,
        university,
        semester,
        wakeUpTime,
        bedtime,
        subjects,
        classes,
        routines,
        studyHoursPerWeek:
          studyHours,
        exerciseDaysPerWeek:
          exerciseDays,
        studyPreferences,
      })
    }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">

      <div className="w-full max-w-lg">

        {/* LOGO */}
        <div className="flex items-center justify-center gap-2.5 mb-10">

          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">

            <CalendarDays
              size={18}
              className="text-white"
            />

          </div>

          <span className="font-display font-700 text-xl text-slate-900 dark:text-white">
            My Scheduler
          </span>

        </div>

        {/* PROGRESS */}
        <div className="flex items-center gap-2 mb-8 justify-center">

          {STEPS.map(
            (
              stepName,
              index
            ) => (
              <div
                key={
                  stepName
                }
                className="flex items-center gap-2"
              >

                <button
                  type="button"
                  onClick={() =>
                    index <
                      step &&
                    setStep(
                      index
                    )
                  }
                  className={`w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center transition-all ${
                    index <
                    step
                      ? 'bg-indigo-600 text-white'
                      : index ===
                        step
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {index <
                  step ? (
                    <Check
                      size={
                        13
                      }
                    />
                  ) : (
                    index + 1
                  )}
                </button>

                {index <
                  STEPS.length -
                    1 && (
                  <div
                    className={`w-6 h-0.5 ${
                      index <
                      step
                        ? 'bg-indigo-600'
                        : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                )}

              </div>
            )
          )}

        </div>

        {/* CARD */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">

          <h2 className="font-display font-700 text-2xl text-slate-900 dark:text-white mb-1">
            {step === 0 &&
              'Tell us about yourself'}

            {step === 1 &&
              'Build your timetable'}

            {step === 2 &&
              'Build your routine'}

            {step === 3 &&
              'Set your goals'}

            {step === 4 &&
              "You're all set!"}
          </h2>

          <p className="text-slate-500 dark:text-slate-400 text-sm mb-7">

            {step === 0 &&
              'Help us understand your usual day.'}

            {step === 1 &&
              'Add your subjects and weekly classes, including where they are held and who teaches them.'}

            {step === 2 &&
              'Add fixed commitments and flexible activities.'}

            {step === 3 &&
              'Tell us when and how much you prefer to study.'}

            {step === 4 &&
              'Your information is ready for My Scheduler.'}

          </p>

          {/* STEP 1 — ABOUT YOU */}
          {step === 0 && (
            <div className="space-y-4">

              <div>

                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Your Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={e =>
                    setName(
                      e.target.value
                    )
                  }
                  placeholder="Enter your name"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

              </div>

              <div>

                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  University / School
                </label>

                <input
                  type="text"
                  value={
                    university
                  }
                  onChange={e =>
                    setUniversity(
                      e.target.value
                    )
                  }
                  placeholder="Enter your university or school"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

              </div>

              <div>

                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Current Semester
                </label>

                <input
                  type="text"
                  value={
                    semester
                  }
                  onChange={e =>
                    setSemester(
                      e.target.value
                    )
                  }
                  placeholder="e.g. Semester 1, Final Year"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <TimePicker
                  label="Typical Wake-up"
                  hour={
                    wakeHour
                  }
                  minute={
                    wakeMinute
                  }
                  meridiem={
                    wakeMeridiem
                  }
                  onHourChange={
                    setWakeHour
                  }
                  onMinuteChange={
                    setWakeMinute
                  }
                  onMeridiemChange={
                    setWakeMeridiem
                  }
                />

                <TimePicker
                  label="Typical Bedtime"
                  hour={
                    bedHour
                  }
                  minute={
                    bedMinute
                  }
                  meridiem={
                    bedMeridiem
                  }
                  onHourChange={
                    setBedHour
                  }
                  onMinuteChange={
                    setBedMinute
                  }
                  onMeridiemChange={
                    setBedMeridiem
                  }
                />

              </div>

            </div>
          )}

          {/* STEP 2 — ACADEMICS */}
          {step === 1 && (
            <div className="space-y-5">

              {subjects.length >
                0 && (
                <div className="flex flex-wrap gap-2">

                  {subjects.map(
                    (
                      subject,
                      index
                    ) => (
                      <span
                        key={
                          subject
                        }
                        className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full text-xs"
                      >

                        <span
                          className={`w-2 h-2 rounded-full ${
                            SUBJECT_COLORS[
                              index %
                                SUBJECT_COLORS.length
                            ]
                          }`}
                        />

                        {
                          subject
                        }

                        <button
                          type="button"
                          onClick={() =>
                            removeSubject(
                              index
                            )
                          }
                        >
                          <X
                            size={
                              11
                            }
                          />
                        </button>

                      </span>
                    )
                  )}

                </div>
              )}

              {/* ADD SUBJECT */}
              <div className="flex gap-2">

                <input
                  value={
                    newSubject
                  }
                  onChange={e =>
                    setNewSubject(
                      e.target.value
                    )
                  }
                  onKeyDown={e => {
                    if (
                      e.key ===
                      'Enter'
                    ) {
                      e.preventDefault()
                      addSubject()
                    }
                  }}
                  placeholder="Add a subject..."
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm"
                />

                <button
                  type="button"
                  onClick={
                    addSubject
                  }
                  className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center"
                >
                  <Plus
                    size={
                      16
                    }
                  />
                </button>

              </div>

              {/* ADD CLASS */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">

                <p className="text-xs font-semibold text-slate-500 uppercase">
                  Add a class
                </p>

                {/* DAY + SUBJECT */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      Day
                    </label>

                    <select
                      value={
                        classDay
                      }
                      onChange={e =>
                        setClassDay(
                          e.target.value
                        )
                      }
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm"
                    >
                      {DAYS.map(
                        day => (
                          <option
                            key={
                              day
                            }
                            value={
                              day
                            }
                          >
                            {
                              day
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      Subject
                    </label>

                    <select
                      value={
                        classSubject
                      }
                      onChange={e =>
                        setClassSubject(
                          e.target.value
                        )
                      }
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm"
                    >
                      <option value="">
                        Select subject
                      </option>

                      {subjects.map(
                        subject => (
                          <option
                            key={
                              subject
                            }
                            value={
                              subject
                            }
                          >
                            {
                              subject
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                </div>

                {/* START + END */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      Start
                    </label>

                    <input
                      type="time"
                      value={
                        classStartTime
                      }
                      onChange={e =>
                        setClassStartTime(
                          e.target.value
                        )
                      }
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      End
                    </label>

                    <input
                      type="time"
                      value={
                        classEndTime
                      }
                      onChange={e =>
                        setClassEndTime(
                          e.target.value
                        )
                      }
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm"
                    />
                  </div>

                </div>

                {/* VENUE */}
                <div>

                  <label className="block text-xs text-slate-500 mb-1">
                    Venue / Classroom
                  </label>

                  <div className="relative">

                    <MapPin
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      value={
                        classVenue
                      }
                      onChange={e =>
                        setClassVenue(
                          e.target.value
                        )
                      }
                      placeholder="e.g. Computer Lab 2, Room B12"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                    />

                  </div>

                </div>

                {/* LECTURER */}
                <div>

                  <label className="block text-xs text-slate-500 mb-1">
                    Lecturer
                  </label>

                  <div className="relative">

                    <UserRound
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      value={
                        classLecturer
                      }
                      onChange={e =>
                        setClassLecturer(
                          e.target.value
                        )
                      }
                      placeholder="e.g. Dr. John Smith"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                    />

                  </div>

                </div>

                <button
                  type="button"
                  onClick={
                    addClass
                  }
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl"
                >
                  + Add Class
                </button>

                {/* WEEKLY TIMETABLE */}
                {classes.length >
                  0 && (
                  <div className="space-y-3 pt-3">

                    <p className="text-xs font-semibold text-slate-500 uppercase">
                      Weekly timetable
                    </p>

                    {DAYS.map(
                      day => {
                        const dayClasses =
                          classes
                            .filter(
                              item =>
                                item.day ===
                                day
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

                        if (
                          dayClasses.length ===
                          0
                        ) {
                          return null
                        }

                        return (
                          <div
                            key={
                              day
                            }
                            className="space-y-2"
                          >

                            <p className="text-xs font-semibold">
                              {day}
                            </p>

                            {dayClasses.map(
                              item => (
                                <div
                                  key={
                                    item.id
                                  }
                                  className="flex items-start justify-between gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3"
                                >

                                  <div className="min-w-0">

                                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                                      {
                                        item.subject
                                      }
                                    </p>

                                    <p className="text-xs text-slate-500 mt-1">
                                      {format24HourTime(
                                        item.startTime
                                      )}{' '}
                                      –{' '}
                                      {format24HourTime(
                                        item.endTime
                                      )}
                                    </p>

                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5">

                                      <MapPin
                                        size={
                                          11
                                        }
                                      />

                                      <span className="truncate">
                                        {
                                          item.venue
                                        }
                                      </span>

                                    </div>

                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">

                                      <UserRound
                                        size={
                                          11
                                        }
                                      />

                                      <span className="truncate">
                                        {
                                          item.lecturer
                                        }
                                      </span>

                                    </div>

                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeClass(
                                        item.id
                                      )
                                    }
                                    className="text-slate-400 hover:text-red-500 flex-shrink-0"
                                  >
                                    <Trash2
                                      size={
                                        15
                                      }
                                    />
                                  </button>

                                </div>
                              )
                            )}

                          </div>
                        )
                      }
                    )}

                  </div>
                )}

              </div>

            </div>
          )}

          {/* STEP 3 — ROUTINES */}
          {step === 2 && (
            <div className="space-y-5">

              <div>

                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Routine name
                </label>

                <input
                  value={
                    routineName
                  }
                  onChange={e =>
                    setRoutineName(
                      e.target.value
                    )
                  }
                  placeholder="e.g. Gym, Laundry, Prayer, Work..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm"
                />

              </div>

              <div>

                <p className="text-xs text-slate-400 mb-2">
                  Quick suggestions
                </p>

                <div className="flex flex-wrap gap-2">

                  {ROUTINE_SUGGESTIONS.map(
                    item => (
                      <button
                        type="button"
                        key={
                          item
                        }
                        onClick={() =>
                          setRoutineName(
                            item
                          )
                        }
                        className="text-xs bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1.5 text-slate-600 dark:text-slate-300"
                      >
                        {item}
                      </button>
                    )
                  )}

                </div>

              </div>

              <div>

                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  When should this happen?
                </label>

                <div className="grid grid-cols-2 gap-2">

                  <button
                    type="button"
                    onClick={() =>
                      setRoutineType(
                        'fixed'
                      )
                    }
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm ${
                      routineType ===
                      'fixed'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <Lock
                      size={
                        14
                      }
                    />
                    Fixed Time
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setRoutineType(
                        'flexible'
                      )
                    }
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm ${
                      routineType ===
                      'flexible'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <Shuffle
                      size={
                        14
                      }
                    />
                    Flexible
                  </button>

                </div>

              </div>

              {routineType ===
                'fixed' && (
                <div className="space-y-4">

                  <div>

                    <p className="text-xs font-medium text-slate-500 mb-2">
                      Repeat on
                    </p>

                    <div className="grid grid-cols-4 gap-2">

                      {DAYS.map(
                        day => (
                          <button
                            type="button"
                            key={
                              day
                            }
                            onClick={() =>
                              toggleRoutineDay(
                                day
                              )
                            }
                            className={`py-2 text-xs rounded-lg border ${
                              routineDays.includes(
                                day
                              )
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {day.slice(
                              0,
                              3
                            )}
                          </button>
                        )
                      )}

                    </div>

                  </div>

                  <div className="grid grid-cols-2 gap-3">

                    <div>

                      <label className="block text-xs text-slate-500 mb-1">
                        Start
                      </label>

                      <input
                        type="time"
                        value={
                          routineStartTime
                        }
                        onChange={e =>
                          setRoutineStartTime(
                            e.target.value
                          )
                        }
                        className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2"
                      />

                    </div>

                    <div>

                      <label className="block text-xs text-slate-500 mb-1">
                        End
                      </label>

                      <input
                        type="time"
                        value={
                          routineEndTime
                        }
                        onChange={e =>
                          setRoutineEndTime(
                            e.target.value
                          )
                        }
                        className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2"
                      />

                    </div>

                  </div>

                </div>
              )}

              {routineType ===
                'flexible' && (
                <div>

                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    How much time does it need?
                  </label>

                  <select
                    value={
                      routineDuration
                    }
                    onChange={e =>
                      setRoutineDuration(
                        Number(
                          e.target.value
                        )
                      )
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5"
                  >
                    <option value={15}>
                      15 minutes
                    </option>

                    <option value={30}>
                      30 minutes
                    </option>

                    <option value={45}>
                      45 minutes
                    </option>

                    <option value={60}>
                      1 hour
                    </option>

                    <option value={90}>
                      1 hour 30 minutes
                    </option>

                    <option value={120}>
                      2 hours
                    </option>

                    <option value={180}>
                      3 hours
                    </option>
                  </select>

                </div>
              )}

              <button
                type="button"
                onClick={
                  addRoutine
                }
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm py-2.5 rounded-xl flex items-center justify-center gap-2"
              >
                <Plus
                  size={
                    15
                  }
                />
                Add Routine
              </button>

              {routines.length >
                0 && (
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">

                  <p className="text-xs font-semibold text-slate-500 uppercase">
                    Your routines
                  </p>

                  {routines.map(
                    routine => (
                      <div
                        key={
                          routine.id
                        }
                        className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3"
                      >

                        <div className="min-w-0">

                          <div className="flex items-center gap-2">

                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                              {
                                routine.name
                              }
                            </p>

                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                routine.type ===
                                'fixed'
                                  ? 'bg-indigo-100 text-indigo-600'
                                  : 'bg-emerald-100 text-emerald-600'
                              }`}
                            >
                              {routine.type ===
                              'fixed'
                                ? 'Fixed'
                                : 'Flexible'}
                            </span>

                          </div>

                          {routine.type ===
                            'fixed' && (
                            <p className="text-xs text-slate-500 mt-1">
                              {routine.days.join(
                                ', '
                              )}{' '}
                              ·{' '}
                              {format24HourTime(
                                routine.startTime ||
                                  ''
                              )}{' '}
                              –{' '}
                              {format24HourTime(
                                routine.endTime ||
                                  ''
                              )}
                            </p>
                          )}

                          {routine.type ===
                            'flexible' && (
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <Clock
                                size={
                                  10
                                }
                              />
                              {
                                routine.durationMinutes
                              }{' '}
                              minutes
                            </p>
                          )}

                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeRoutine(
                              routine.id
                            )
                          }
                          className="text-slate-400 hover:text-red-500"
                        >
                          <Trash2
                            size={
                              15
                            }
                          />
                        </button>

                      </div>
                    )
                  )}

                </div>
              )}

            </div>
          )}

          {/* STEP 4 — GOALS */}
          {step === 3 && (
            <div className="space-y-6">

              <div>

                <div className="flex justify-between mb-2">

                  <label className="text-sm font-medium">
                    Study hours per week
                  </label>

                  <span className="text-indigo-600 font-semibold">
                    {
                      studyHours
                    }
                    h
                  </span>

                </div>

                <input
                  type="range"
                  min={1}
                  max={60}
                  value={
                    studyHours
                  }
                  onChange={e =>
                    setStudyHours(
                      Number(
                        e.target.value
                      )
                    )
                  }
                  className="w-full accent-indigo-600"
                />

              </div>

              <div>

                <div className="flex justify-between mb-2">

                  <label className="text-sm font-medium">
                    Exercise days per week
                  </label>

                  <span className="text-indigo-600 font-semibold">
                    {
                      exerciseDays
                    }
                  </span>

                </div>

                <div className="flex gap-1.5">

                  {[
                    0,
                    1,
                    2,
                    3,
                    4,
                    5,
                    6,
                    7,
                  ].map(
                    value => (
                      <button
                        type="button"
                        key={
                          value
                        }
                        onClick={() =>
                          setExerciseDays(
                            value
                          )
                        }
                        className={`flex-1 py-2 rounded-lg text-xs ${
                          exerciseDays ===
                          value
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {value}
                      </button>
                    )
                  )}

                </div>

              </div>

              <div>

                <label className="block text-sm font-medium mb-1">
                  Preferred study times
                </label>

                <p className="text-xs text-slate-400 mb-4">
                  Select any combination.
                </p>

                <div className="space-y-3">

                  {[
                    {
                      title:
                        'Morning',
                      enabled:
                        morningEnabled,
                      toggle:
                        setMorningEnabled,
                      start:
                        morningStart,
                      setStart:
                        setMorningStart,
                      end:
                        morningEnd,
                      setEnd:
                        setMorningEnd,
                    },
                    {
                      title:
                        'Afternoon',
                      enabled:
                        afternoonEnabled,
                      toggle:
                        setAfternoonEnabled,
                      start:
                        afternoonStart,
                      setStart:
                        setAfternoonStart,
                      end:
                        afternoonEnd,
                      setEnd:
                        setAfternoonEnd,
                    },
                    {
                      title:
                        'Evening',
                      enabled:
                        eveningEnabled,
                      toggle:
                        setEveningEnabled,
                      start:
                        eveningStart,
                      setStart:
                        setEveningStart,
                      end:
                        eveningEnd,
                      setEnd:
                        setEveningEnd,
                    },
                  ].map(
                    period => (
                      <div
                        key={
                          period.title
                        }
                        className={`border rounded-xl p-4 ${
                          period.enabled
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}
                      >

                        <button
                          type="button"
                          onClick={() =>
                            period.toggle(
                              !period.enabled
                            )
                          }
                          className="flex items-center gap-2"
                        >

                          <div
                            className={`w-5 h-5 rounded border flex items-center justify-center ${
                              period.enabled
                                ? 'bg-indigo-600 border-indigo-600'
                                : 'border-slate-300'
                            }`}
                          >
                            {period.enabled && (
                              <Check
                                size={
                                  11
                                }
                                className="text-white"
                              />
                            )}
                          </div>

                          <span className="text-sm font-medium">
                            {
                              period.title
                            }
                          </span>

                        </button>

                        {period.enabled && (
                          <div className="grid grid-cols-2 gap-3 mt-3">

                            <div>

                              <label className="text-xs text-slate-500">
                                From
                              </label>

                              <input
                                type="time"
                                value={
                                  period.start
                                }
                                onChange={e =>
                                  period.setStart(
                                    e.target.value
                                  )
                                }
                                className="w-full mt-1 bg-white dark:bg-slate-900 border rounded-lg px-3 py-2"
                              />

                            </div>

                            <div>

                              <label className="text-xs text-slate-500">
                                Until
                              </label>

                              <input
                                type="time"
                                value={
                                  period.end
                                }
                                onChange={e =>
                                  period.setEnd(
                                    e.target.value
                                  )
                                }
                                className="w-full mt-1 bg-white dark:bg-slate-900 border rounded-lg px-3 py-2"
                              />

                            </div>

                          </div>
                        )}

                      </div>
                    )
                  )}

                </div>

              </div>

            </div>
          )}

          {/* STEP 5 */}
          {step === 4 && (
            <div className="text-center py-4">

              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center mx-auto mb-5">

                <Check
                  size={
                    36
                  }
                  className="text-white"
                />

              </div>

              <h3 className="font-display font-700 text-lg">
                Your schedule is ready
              </h3>

              <p className="text-sm text-slate-500 mt-2">
                My Scheduler now has enough information to start organizing your time.
              </p>

              <div className="grid grid-cols-3 gap-3 mt-6">

                <div className="bg-indigo-50 dark:bg-indigo-950/50 rounded-xl p-3">

                  <p className="font-bold text-xl text-indigo-600">
                    {
                      subjects.length
                    }
                  </p>

                  <p className="text-xs text-slate-500">
                    Subjects
                  </p>

                </div>

                <div className="bg-indigo-50 dark:bg-indigo-950/50 rounded-xl p-3">

                  <p className="font-bold text-xl text-indigo-600">
                    {
                      classes.length
                    }
                  </p>

                  <p className="text-xs text-slate-500">
                    Classes/wk
                  </p>

                </div>

                <div className="bg-indigo-50 dark:bg-indigo-950/50 rounded-xl p-3">

                  <p className="font-bold text-xl text-indigo-600">
                    {
                      routines.length
                    }
                  </p>

                  <p className="text-xs text-slate-500">
                    Routines
                  </p>

                </div>

              </div>

            </div>
          )}

        </div>

        {/* NAVIGATION */}
        <div className="flex items-center justify-between mt-5">

          <button
            type="button"
            disabled={
              step === 0
            }
            onClick={() =>
              setStep(
                current =>
                  Math.max(
                    0,
                    current -
                      1
                  )
              )
            }
            className="flex items-center gap-1.5 text-sm text-slate-500 disabled:opacity-30"
          >
            <ChevronLeft
              size={
                16
              }
            />
            Back
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() =>
                setStep(
                  current =>
                    current +
                    1
                )
              }
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl"
            >
              Continue
              <ChevronRight
                size={
                  15
                }
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={
                finishOnboarding
              }
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl"
            >
              Build My Schedule
              <Sparkles
                size={
                  14
                }
              />
            </button>
          )}

        </div>

      </div>

    </div>
  )
}