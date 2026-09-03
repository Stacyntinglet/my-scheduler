import { useState } from 'react'
import { X, CalendarDays } from 'lucide-react'
import { supabase } from '../utils/supabase'

export interface CalendarCustomEvent {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  category: string
  notes: string
  location?: string
  color?: string | null
  completed?: boolean
}

interface AddEventModalProps {
  onClose: () => void
  onEventAdded?: (event: CalendarCustomEvent) => void
  onEventUpdated?: (event: CalendarCustomEvent) => void
  defaultDate?: string
  eventToEdit?: CalendarCustomEvent | null
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

function rowToCalendarEvent(
  row: CustomEventRow
): CalendarCustomEvent {
  return {
    id: row.id,
    title: row.title,
    date: row.event_date,
    startTime: row.start_time?.slice(0, 5) ?? '',
    endTime: row.end_time?.slice(0, 5) ?? '',
    category: row.category || 'Personal',
    notes: row.description || '',
    location: row.location || '',
    color: row.color,
    completed: row.completed,
  }
}

function mirrorEventLocally(
  event: CalendarCustomEvent
) {
  const saved = localStorage.getItem(
    'mySchedulerEvents'
  )

  let existing: CalendarCustomEvent[] = []

  if (saved) {
    try {
      existing = JSON.parse(
        saved
      ) as CalendarCustomEvent[]
    } catch {
      existing = []
    }
  }

  const withoutCurrent =
    existing.filter(
      existingEvent =>
        existingEvent.id !== event.id
    )

  localStorage.setItem(
    'mySchedulerEvents',
    JSON.stringify([
      ...withoutCurrent,
      event,
    ])
  )
}

export default function AddEventModal({
  onClose,
  onEventAdded,
  onEventUpdated,
  defaultDate = '',
  eventToEdit = null,
}: AddEventModalProps) {
  const isEditing = Boolean(eventToEdit)

  const [title, setTitle] =
    useState(
      eventToEdit?.title ?? ''
    )

  const [date, setDate] =
    useState(
      eventToEdit?.date ??
        defaultDate
    )

  const [startTime, setStartTime] =
    useState(
      eventToEdit?.startTime ??
        '09:00'
    )

  const [endTime, setEndTime] =
    useState(
      eventToEdit?.endTime ??
        '10:00'
    )

  const [category, setCategory] =
    useState(
      eventToEdit?.category ??
        'Personal'
    )

  const [notes, setNotes] =
    useState(
      eventToEdit?.notes ??
        ''
    )

  const [error, setError] =
    useState('')

  const [saving, setSaving] =
    useState(false)

  const saveEvent = async () => {
    const cleanTitle =
      title.trim()

    if (!cleanTitle) {
      setError(
        'Please enter an event name.'
      )
      return
    }

    if (!date) {
      setError(
        'Please select a date.'
      )
      return
    }

    if (
      !startTime ||
      !endTime
    ) {
      setError(
        'Please select a start and end time.'
      )
      return
    }

    if (
      endTime <=
      startTime
    ) {
      setError(
        'The end time must be later than the start time.'
      )
      return
    }

    setSaving(true)
    setError('')

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
          'You are not signed in. Please sign in again.'
        )
      }

      if (
        isEditing &&
        eventToEdit
      ) {
        const {
          data,
          error: updateError,
        } = await supabase
          .from('custom_events')
          .update({
            title: cleanTitle,
            description:
              notes.trim() || null,
            event_date: date,
            start_time: startTime,
            end_time: endTime,
            category,
          })
          .eq('id', eventToEdit.id)
          .eq('user_id', user.id)
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
          .single()

        if (updateError) {
          throw updateError
        }

        const updatedEvent =
          rowToCalendarEvent(
            data as CustomEventRow
          )

        /*
         * Temporary compatibility mirror.
         * CalendarView will be migrated
         * directly to Supabase next.
         */
        mirrorEventLocally(
          updatedEvent
        )

        onEventUpdated?.(
          updatedEvent
        )

        onClose()
        return
      }

      const {
        data,
        error: insertError,
      } = await supabase
        .from('custom_events')
        .insert({
          user_id: user.id,
          title: cleanTitle,
          description:
            notes.trim() || null,
          event_date: date,
          start_time: startTime,
          end_time: endTime,
          location: null,
          color: null,
          completed: false,
          category,
        })
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
        .single()

      if (insertError) {
        throw insertError
      }

      const newEvent =
        rowToCalendarEvent(
          data as CustomEventRow
        )

      /*
       * Keep the old localStorage copy
       * temporarily so screens that have
       * not yet been migrated do not break.
       *
       * Supabase is now the source of truth.
       */
      mirrorEventLocally(
        newEvent
      )

      onEventAdded?.(
        newEvent
      )

      onClose()
    } catch (err) {
      console.error(
        'Failed to save event:',
        err
      )

      const message =
        err instanceof Error
          ? err.message
          : ''

      setError(
        message ||
          'The event could not be saved. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        onClick={
          saving
            ? undefined
            : onClose
        }
      />

      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6">

        <div className="flex items-center justify-between mb-5">

          <div className="flex items-center gap-3">

            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center">

              <CalendarDays
                size={17}
                className="text-indigo-600 dark:text-indigo-400"
              />

            </div>

            <div>

              <h2 className="font-display font-700 text-xl text-slate-900 dark:text-white">
                {isEditing
                  ? 'Edit Event'
                  : 'Add Event'}
              </h2>

              <p className="text-xs text-slate-400 mt-0.5">
                {isEditing
                  ? 'Update the details of this event.'
                  : 'Add a fixed event to your schedule.'}
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={16} />
          </button>

        </div>

        <div className="space-y-4">

          <div>

            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Event Name
            </label>

            <input
              autoFocus
              type="text"
              value={title}
              disabled={saving}
              onChange={e => {
                setTitle(
                  e.target.value
                )
                setError('')
              }}
              placeholder="e.g. Doctor appointment"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            />

          </div>

          <div>

            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Date
            </label>

            <input
              type="date"
              value={date}
              disabled={saving}
              onChange={e => {
                setDate(
                  e.target.value
                )
                setError('')
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            />

          </div>

          <div className="grid grid-cols-2 gap-3">

            <div>

              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Start Time
              </label>

              <input
                type="time"
                value={startTime}
                disabled={saving}
                onChange={e => {
                  setStartTime(
                    e.target.value
                  )
                  setError('')
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              />

            </div>

            <div>

              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                End Time
              </label>

              <input
                type="time"
                value={endTime}
                disabled={saving}
                onChange={e => {
                  setEndTime(
                    e.target.value
                  )
                  setError('')
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              />

            </div>

          </div>

          <div>

            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Category
            </label>

            <select
              value={category}
              disabled={saving}
              onChange={e => {
                setCategory(
                  e.target.value
                )
                setError('')
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            >

              <option value="Personal">
                Personal
              </option>

              <option value="Academic">
                Academic
              </option>

              <option value="Work">
                Work
              </option>

              <option value="Appointment">
                Appointment
              </option>

              <option value="Meeting">
                Meeting
              </option>

              <option value="Social">
                Social
              </option>

              <option value="Other">
                Other
              </option>

            </select>

          </div>

          <div>

            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Notes
              <span className="font-normal text-slate-400">
                {' '}
                (optional)
              </span>
            </label>

            <textarea
              value={notes}
              disabled={saving}
              onChange={e => {
                setNotes(
                  e.target.value
                )
                setError('')
              }}
              rows={3}
              placeholder="Add any useful details..."
              className="w-full resize-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            />

          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2.5">

              <p className="text-xs text-red-600 dark:text-red-400">
                {error}
              </p>

            </div>
          )}

        </div>

        <div className="flex gap-3 mt-6">

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={saveEvent}
            disabled={
              saving ||
              !title.trim() ||
              !date ||
              !startTime ||
              !endTime
            }
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            {saving
              ? isEditing
                ? 'Saving...'
                : 'Adding...'
              : isEditing
                ? 'Save Changes'
                : 'Add Event'}
          </button>

        </div>

      </div>

    </div>
  )
}