import { supabase } from './supabase'
import type { UserProfile } from '../types'

const SUBJECT_STYLES = [
  {
    dot_color: '#6366f1',
    bg_light: '#eef2ff',
    text_color: '#4338ca',
  },
  {
    dot_color: '#8b5cf6',
    bg_light: '#f5f3ff',
    text_color: '#6d28d9',
  },
  {
    dot_color: '#3b82f6',
    bg_light: '#eff6ff',
    text_color: '#1d4ed8',
  },
  {
    dot_color: '#06b6d4',
    bg_light: '#ecfeff',
    text_color: '#0e7490',
  },
  {
    dot_color: '#10b981',
    bg_light: '#ecfdf5',
    text_color: '#047857',
  },
  {
    dot_color: '#f59e0b',
    bg_light: '#fffbeb',
    text_color: '#b45309',
  },
  {
    dot_color: '#f43f5e',
    bg_light: '#fff1f2',
    text_color: '#be123c',
  },
  {
    dot_color: '#ec4899',
    bg_light: '#fdf2f8',
    text_color: '#be185d',
  },
]

export async function saveOnboarding(
  profile: UserProfile
) {
  /*
   * STEP 1
   * Find the currently signed-in Supabase user.
   */
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    throw new Error(
      'You are not signed in. Please sign in again.'
    )
  }

  const userId = user.id

  /*
   * STEP 2
   * Save the main profile information.
   *
   * onboarding_completed remains false until
   * all the other onboarding information has
   * been saved successfully.
   */
  const {
    error: profileError,
  } = await supabase
    .from('profiles')
    .update({
      full_name: profile.name.trim(),
      university:
        profile.university.trim(),
      semester:
        profile.semester.trim(),
      wake_up_time:
        profile.wakeUpTime,
      bedtime:
        profile.bedtime,
      study_hours_per_week:
        profile.studyHoursPerWeek,
      exercise_days_per_week:
        profile.exerciseDaysPerWeek,
      onboarding_completed: false,
    })
    .eq('id', userId)

  if (profileError) {
    throw profileError
  }

  /*
   * STEP 3
   * Clear any unfinished onboarding records.
   *
   * This makes retrying onboarding safer if
   * an earlier save stopped halfway through.
   *
   * Classes are deleted before subjects because
   * classes can reference subjects.
   */
  const {
    error: deleteClassesError,
  } = await supabase
    .from('classes')
    .delete()
    .eq('user_id', userId)

  if (deleteClassesError) {
    throw deleteClassesError
  }

  const {
    error: deleteSubjectsError,
  } = await supabase
    .from('subjects')
    .delete()
    .eq('user_id', userId)

  if (deleteSubjectsError) {
    throw deleteSubjectsError
  }

  const {
    error: deleteRoutinesError,
  } = await supabase
    .from('routines')
    .delete()
    .eq('user_id', userId)

  if (deleteRoutinesError) {
    throw deleteRoutinesError
  }

  const {
    error: deletePreferencesError,
  } = await supabase
    .from('study_preferences')
    .delete()
    .eq('user_id', userId)

  if (deletePreferencesError) {
    throw deletePreferencesError
  }

  /*
   * STEP 4
   * Insert subjects.
   *
   * Supabase returns each new subject UUID.
   * We need those UUIDs when creating classes.
   */
  const subjectIdByName =
    new Map<string, string>()

  if (profile.subjects.length > 0) {
    const subjectRows =
      profile.subjects.map(
        (subject, index) => {
          const style =
            SUBJECT_STYLES[
              index %
                SUBJECT_STYLES.length
            ]

          return {
            user_id: userId,
            name: subject,
            dot_color:
              style.dot_color,
            bg_light:
              style.bg_light,
            text_color:
              style.text_color,
          }
        }
      )

    const {
      data: savedSubjects,
      error: subjectsError,
    } = await supabase
      .from('subjects')
      .insert(subjectRows)
      .select('id, name')

    if (subjectsError) {
      throw subjectsError
    }

    savedSubjects?.forEach(
      subject => {
        subjectIdByName.set(
          subject.name,
          subject.id
        )
      }
    )
  }

  /*
   * STEP 5
   * Insert the weekly class timetable.
   */
  if (profile.classes.length > 0) {
    const classRows =
      profile.classes.map(
        classItem => {
          const subjectId =
            subjectIdByName.get(
              classItem.subject
            )

          if (!subjectId) {
            throw new Error(
              `Could not find the saved subject "${classItem.subject}".`
            )
          }

          return {
            user_id: userId,
            subject_id: subjectId,
            subject:
              classItem.subject,
            day: classItem.day,
            start_time:
              classItem.startTime,
            end_time:
              classItem.endTime,
            venue:
              classItem.venue,
            lecturer:
              classItem.lecturer,
            color: null,
          }
        }
      )

    const {
      error: classesError,
    } = await supabase
      .from('classes')
      .insert(classRows)

    if (classesError) {
      throw classesError
    }
  }

  /*
   * STEP 6
   * Insert fixed and flexible routines.
   */
  if (profile.routines.length > 0) {
    const routineRows =
      profile.routines.map(
        routine => ({
          user_id: userId,
          name: routine.name,
          routine_type:
            routine.type,
          days: routine.days,
          start_time:
            routine.type === 'fixed'
              ? routine.startTime ??
                null
              : null,
          end_time:
            routine.type === 'fixed'
              ? routine.endTime ??
                null
              : null,
          duration_minutes:
            routine.type === 'flexible'
              ? routine.durationMinutes ??
                null
              : null,
          color: null,
        })
      )

    const {
      error: routinesError,
    } = await supabase
      .from('routines')
      .insert(routineRows)

    if (routinesError) {
      throw routinesError
    }
  }

  /*
   * STEP 7
   * Insert preferred study periods.
   */
  if (
    profile.studyPreferences.length >
    0
  ) {
    const preferenceRows =
      profile.studyPreferences.map(
        preference => ({
          user_id: userId,
          period:
            preference.period,
          start_time:
            preference.startTime,
          end_time:
            preference.endTime,
        })
      )

    const {
      error: preferencesError,
    } = await supabase
      .from('study_preferences')
      .insert(preferenceRows)

    if (preferencesError) {
      throw preferencesError
    }
  }

  /*
   * STEP 8
   * Everything has saved successfully.
   * Mark onboarding as complete.
   */
  const {
    error: completeError,
  } = await supabase
    .from('profiles')
    .update({
      onboarding_completed: true,
    })
    .eq('id', userId)

  if (completeError) {
    throw completeError
  }

  return {
    userId,
    profile,
  }
}