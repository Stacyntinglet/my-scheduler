import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  GraduationCap,
  MapPin,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';

import type { Assessment, UserProfile } from '../types';
import { createId } from '../utils/createId';
import { supabase } from '../utils/supabase';

type AcadTab = 'overview' | 'assessments' | 'planner';

interface AcademicsViewProps {
  userProfile: UserProfile | null;
}

interface StudyPlanSession {
  id: string;
  day: string;
  subject: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  reason: string;
  assessmentId?: string;
}

interface TimeBlock {
  start: number;
  end: number;
}

const SUBJECT_STYLES = [
  {
    dotColor: 'bg-indigo-500',
    bgLight: 'bg-indigo-50 dark:bg-indigo-950/50',
    textColor: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    dotColor: 'bg-violet-500',
    bgLight: 'bg-violet-50 dark:bg-violet-950/50',
    textColor: 'text-violet-600 dark:text-violet-400',
  },
  {
    dotColor: 'bg-blue-500',
    bgLight: 'bg-blue-50 dark:bg-blue-950/50',
    textColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    dotColor: 'bg-cyan-500',
    bgLight: 'bg-cyan-50 dark:bg-cyan-950/50',
    textColor: 'text-cyan-600 dark:text-cyan-400',
  },
  {
    dotColor: 'bg-emerald-500',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/50',
    textColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    dotColor: 'bg-amber-500',
    bgLight: 'bg-amber-50 dark:bg-amber-950/50',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    dotColor: 'bg-rose-500',
    bgLight: 'bg-rose-50 dark:bg-rose-950/50',
    textColor: 'text-rose-600 dark:text-rose-400',
  },
];

const ASSESSMENT_TYPES = [
  'Exam',
  'Test',
  'Quiz',
  'CA',
  'Assignment',
  'Project',
  'Presentation',
  'Lab',
  'Other',
];

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

function formatTime(time: string) {
  if (!time) return '';

  const [hourString, minute] = time.split(':');
  const hour = Number(hourString);

  return `${hour % 12 || 12}:${minute} ${
    hour >= 12 ? 'PM' : 'AM'
  }`;
}

function calculateDaysLeft(date: string) {
  if (!date) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${date}T00:00:00`);
  target.setHours(0, 0, 0, 0);

  return Math.round(
    (target.getTime() - today.getTime()) /
      86400000
  );
}

function formatAssessmentDate(date: string) {
  if (!date) return '';

  return new Intl.DateTimeFormat(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  ).format(
    new Date(`${date}T00:00:00`)
  );
}

function getDateKey(date: Date) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, '0');

  const day =
    String(
      date.getDate()
    ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getScheduledDateForDay(
  dayName: string
) {
  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const currentDay =
    today.getDay();

  const mondayOffset =
    currentDay === 0
      ? -6
      : 1 - currentDay;

  const monday =
    new Date(today);

  monday.setDate(
    today.getDate() +
      mondayOffset
  );

  const dayIndex =
    DAYS.indexOf(
      dayName
    );

  const target =
    new Date(monday);

  target.setDate(
    monday.getDate() +
      Math.max(
        0,
        dayIndex
      )
  );

  return getDateKey(
    target
  );
}

function getDayNameFromDate(
  date: string
) {
  if (!date) return '';

  return new Intl.DateTimeFormat(
    'en-US',
    {
      weekday: 'long',
    }
  ).format(
    new Date(
      `${date}T00:00:00`
    )
  );
}

function mirrorStudyPlanLocally(
  plan: StudyPlanSession[]
) {
  localStorage.setItem(
    'mySchedulerStudyPlan',
    JSON.stringify(
      plan
    )
  );
}

function timeToMinutes(
  time: string
) {
  const [hour, minute] =
    time
      .split(':')
      .map(Number);

  return (
    hour * 60 +
    minute
  );
}

function minutesToTime(
  minutes: number
) {
  const hour =
    Math.floor(
      minutes / 60
    );

  const minute =
    minutes % 60;

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
  )}`;
}

function mergeBlocks(
  blocks: TimeBlock[]
) {
  if (
    !blocks.length
  ) {
    return [];
  }

  const sorted =
    [...blocks].sort(
      (
        a,
        b
      ) =>
        a.start -
        b.start
    );

  const merged:
    TimeBlock[] = [
      {
        ...sorted[0],
      },
    ];

  for (
    let i = 1;
    i <
    sorted.length;
    i += 1
  ) {
    const current =
      sorted[i];

    const previous =
      merged[
        merged.length -
          1
      ];

    if (
      current.start <=
      previous.end
    ) {
      previous.end =
        Math.max(
          previous.end,
          current.end
        );
    } else {
      merged.push({
        ...current,
      });
    }
  }

  return merged;
}

function getFreeBlocks(
  start: number,
  end: number,
  busyBlocks: TimeBlock[]
) {
  const free:
    TimeBlock[] = [];

  const merged =
    mergeBlocks(
      busyBlocks.filter(
        block =>
          block.end >
            start &&
          block.start <
            end
      )
    );

  let cursor =
    start;

  merged.forEach(
    block => {
      const blockStart =
        Math.max(
          block.start,
          start
        );

      const blockEnd =
        Math.min(
          block.end,
          end
        );

      if (
        blockStart >
        cursor
      ) {
        free.push({
          start:
            cursor,
          end:
            blockStart,
        });
      }

      cursor =
        Math.max(
          cursor,
          blockEnd
        );
    }
  );

  if (
    cursor < end
  ) {
    free.push({
      start:
        cursor,
      end,
    });
  }

  return free;
}

function getSubjectPriorityScore(
  subject: string,
  assessments: Assessment[],
  dates: Record<
    string,
    string
  >
) {
  const subjectAssessments =
    assessments.filter(
      item =>
        item.subject ===
        subject
    );

  if (
    !subjectAssessments.length
  ) {
    return 1;
  }

  let score = 1;

  subjectAssessments.forEach(
    assessment => {
      const daysLeft =
        dates[
          assessment.id
        ]
          ? calculateDaysLeft(
              dates[
                assessment.id
              ]
            )
          : assessment.daysLeft;

      const gap =
        100 -
        assessment.progress;

      const urgency =
        daysLeft < 0
          ? 10
          : daysLeft ===
            0
          ? 9
          : daysLeft <=
            2
          ? 8
          : daysLeft <=
            5
          ? 6
          : daysLeft <=
            10
          ? 4
          : 2;

      score +=
        urgency *
        (
          1 +
          gap / 100
        );
    }
  );

  return score;
}

export default function AcademicsView({
  userProfile,
}: AcademicsViewProps) {
  const [
    tab,
    setTab,
  ] =
    useState<AcadTab>(
      'overview'
    );

  const [
    assessments,
    setAssessments,
  ] =
    useState<
      Assessment[]
    >([]);

  const [
    assessmentDates,
    setAssessmentDates,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [
    topicRowIds,
    setTopicRowIds,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [
    loadingAssessments,
    setLoadingAssessments,
  ] =
    useState(
      true
    );

  const [
    showAssessmentModal,
    setShowAssessmentModal,
  ] =
    useState(
      false
    );

  const [
    assessmentSubject,
    setAssessmentSubject,
  ] =
    useState(
      ''
    );

  const [
    assessmentType,
    setAssessmentType,
  ] =
    useState(
      'Exam'
    );

  const [
    assessmentDate,
    setAssessmentDate,
  ] =
    useState(
      ''
    );

  const [
    topics,
    setTopics,
  ] =
    useState<
      string[]
    >([]);

  const [
    newTopic,
    setNewTopic,
  ] =
    useState(
      ''
    );

  const [
    error,
    setError,
  ] =
    useState(
      ''
    );

  const [
    studyPlan,
    setStudyPlan,
  ] =
    useState<
      StudyPlanSession[]
    >([]);

  const [
    loadingStudyPlan,
    setLoadingStudyPlan,
  ] =
    useState(
      true
    );

  const [
    savingStudyPlan,
    setSavingStudyPlan,
  ] =
    useState(
      false
    );

  const [
    plannerMessage,
    setPlannerMessage,
  ] =
    useState(
      ''
    );

  const [
    assessmentPendingDelete,
    setAssessmentPendingDelete,
  ] =
    useState<
      Assessment | null
    >(
      null
    );

  const [
    showClearPlanConfirm,
    setShowClearPlanConfirm,
  ] =
    useState(
      false
    );

  const subjects =
    userProfile
      ?.subjects ??
    [];

  const classes =
    userProfile
      ?.classes ??
    [];

  const routines =
    userProfile
      ?.routines ??
    [];

  const studyPreferences =
    userProfile
      ?.studyPreferences ??
    [];

  const weeklyStudyGoal =
    userProfile
      ?.studyHoursPerWeek ??
    0;

  const semester =
    userProfile
      ?.semester
      ?.trim() ||
    'Semester not set';

  const applyAssessmentState =
    (
      nextAssessments:
        Assessment[],
      nextDates:
        Record<
          string,
          string
        >
    ) => {
      setAssessments(
        nextAssessments
      );

      setAssessmentDates(
        nextDates
      );

    };

  useEffect(
    () => {
      let cancelled =
        false;

      async function loadAssessmentsFromSupabase() {
        try {
          setLoadingAssessments(
            true
          );

          const {
            data: {
              user,
            },
            error:
              userError,
          } =
            await supabase.auth.getUser();

          if (
            userError
          ) {
            throw userError;
          }

          if (!user) {
            if (
              !cancelled
            ) {
              applyAssessmentState(
                [],
                {}
              );
            }

            return;
          }

          const {
            data:
              rows,
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
              );

          if (
            assessmentError
          ) {
            throw assessmentError;
          }

          const assessmentRows =
            rows ??
            [];

          const ids =
            assessmentRows.map(
              row =>
                row.id
            );

          let topicRows:
            any[] = [];

          if (
            ids.length
          ) {
            const {
              data,
              error:
                topicError,
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
                  ids
                );

            if (
              topicError
            ) {
              throw topicError;
            }

            topicRows =
              data ??
              [];
          }

          const dates:
            Record<
              string,
              string
            > = {};

          const rowIds:
            Record<
              string,
              string
            > = {};

          const loaded:
            Assessment[] =
            assessmentRows.map(
              row => {
                const subject =
                  row.subject ??
                  'Subject';

                const style =
                  SUBJECT_STYLES[
                    Math.max(
                      0,
                      subjects.indexOf(
                        subject
                      )
                    ) %
                      SUBJECT_STYLES.length
                  ];

                const date =
                  String(
                    row.assessment_date ??
                      row.due_date ??
                      row.date ??
                      ''
                  ).slice(
                    0,
                    10
                  );

                dates[
                  row.id
                ] =
                  date;

                const loadedTopics =
                  topicRows
                    .filter(
                      topic =>
                        topic.assessment_id ===
                        row.id
                    )
                    .map(
                      topic => {
                        const name =
                          String(
                            topic.name ??
                              topic.topic ??
                              topic.title ??
                              'Topic'
                          );

                        rowIds[
                          `${row.id}::${name}`
                        ] =
                          topic.id;

                        return {
                          name,
                          done:
                            Boolean(
                              topic.done ??
                                topic.completed ??
                                false
                            ),
                        };
                      }
                    );

                const doneCount =
                  loadedTopics.filter(
                    topic =>
                      topic.done
                  ).length;

                const progress =
                  loadedTopics.length
                    ? Math.round(
                        (
                          doneCount /
                          loadedTopics.length
                        ) *
                          100
                      )
                    : Number(
                        row.progress ??
                          0
                      );

                return {
                  id:
                    row.id,

                  subject,

                  dotColor:
                    style.dotColor,

                  type:
                    String(
                      row.assessment_type ??
                        row.type ??
                        'Assessment'
                    ),

                  daysLeft:
                    calculateDaysLeft(
                      date
                    ),

                  topics:
                    loadedTopics,

                  progress,
                };
              }
            );

          if (
            !cancelled
          ) {
            applyAssessmentState(
              loaded,
              dates
            );

            setTopicRowIds(
              rowIds
            );
          }
        } catch (
          loadError
        ) {
          console.error(
            'Failed to load assessments from Supabase:',
            loadError
          );

          if (
            !cancelled
          ) {
            setError(
              loadError instanceof
                Error
                ? loadError.message
                : 'Could not load assessments.'
            );
          }
        } finally {
          if (
            !cancelled
          ) {
            setLoadingAssessments(
              false
            );
          }
        }
      }

      void loadAssessmentsFromSupabase();

      return () => {
        cancelled =
          true;
      };
    },
    []
  );

  const applyStudyPlanState =
    (
      updated:
        StudyPlanSession[]
    ) => {
      setStudyPlan(
        updated
      );

      mirrorStudyPlanLocally(
        updated
      );
    };

  useEffect(
    () => {
      let cancelled =
        false;

      async function loadStudyPlanFromSupabase() {
        try {
          setLoadingStudyPlan(
            true
          );

          const {
            data: {
              user,
            },
            error:
              userError,
          } =
            await supabase.auth.getUser();

          if (
            userError
          ) {
            throw userError;
          }

          if (!user) {
            if (
              !cancelled
            ) {
              applyStudyPlanState(
                []
              );
            }

            return;
          }

          const {
            data:
              planRows,
            error:
              planError,
          } =
            await supabase
              .from(
                'study_plans'
              )
              .select(
                '*'
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
              );

          if (
            planError
          ) {
            throw planError;
          }

          const {
            data:
              subjectRows,
            error:
              subjectError,
          } =
            await supabase
              .from(
                'subjects'
              )
              .select(
                'id, name'
              )
              .eq(
                'user_id',
                user.id
              );

          if (
            subjectError
          ) {
            throw subjectError;
          }

          const subjectNameById =
            new Map<
              string,
              string
            >();

          ;(
            subjectRows ??
            []
          ).forEach(
            row => {
              subjectNameById.set(
                row.id,
                row.name
              );
            }
          );

          const loaded:
            StudyPlanSession[] =
            (
              planRows ??
              []
            ).map(
              row => {
                const scheduledDate =
                  String(
                    row.scheduled_date ??
                      ''
                  ).slice(
                    0,
                    10
                  );

                const subject =
                  (
                    row.subject_id
                      ? subjectNameById.get(
                          row.subject_id
                        )
                      : undefined
                  ) ??
                  String(
                    row.title ??
                      'Study'
                  ).replace(
                    /^Study\s+/i,
                    ''
                  );

                return {
                  id:
                    row.id,

                  day:
                    getDayNameFromDate(
                      scheduledDate
                    ),

                  subject,

                  startTime:
                    String(
                      row.start_time ??
                        ''
                    ).slice(
                      0,
                      5
                    ),

                  endTime:
                    String(
                      row.end_time ??
                        ''
                    ).slice(
                      0,
                      5
                    ),

                  durationMinutes:
                    Number(
                      row.duration_minutes ??
                        0
                    ),

                  reason:
                    String(
                      row.notes ??
                        'Weekly study goal'
                    ),
                };
              }
            );

          if (
            !cancelled
          ) {
            applyStudyPlanState(
              loaded
            );
          }
        } catch (
          loadError
        ) {
          console.error(
            'Failed to load study plan from Supabase:',
            loadError
          );

          if (
            !cancelled
          ) {
            setError(
              loadError instanceof
                Error
                ? loadError.message
                : 'Could not load the study plan.'
            );
          }
        } finally {
          if (
            !cancelled
          ) {
            setLoadingStudyPlan(
              false
            );
          }
        }
      }

      void loadStudyPlanFromSupabase();

      return () => {
        cancelled =
          true;
      };
    },
    []
  );

  const saveStudyPlanToSupabase =
    async (
      generated:
        StudyPlanSession[]
    ) => {
      const {
        data: {
          user,
        },
        error:
          userError,
      } =
        await supabase.auth.getUser();

      if (
        userError
      ) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          'You are not signed in. Please sign in again.'
        );
      }

      const {
        data:
          subjectRows,
        error:
          subjectError,
      } =
        await supabase
          .from(
            'subjects'
          )
          .select(
            'id, name'
          )
          .eq(
            'user_id',
            user.id
          );

      if (
        subjectError
      ) {
        throw subjectError;
      }

      const subjectIdByName =
        new Map<
          string,
          string
        >();

      ;(
        subjectRows ??
        []
      ).forEach(
        row => {
          subjectIdByName.set(
            row.name,
            row.id
          );
        }
      );

      const {
        error:
          deleteError,
      } =
        await supabase
          .from(
            'study_plans'
          )
          .delete()
          .eq(
            'user_id',
            user.id
          );

      if (
        deleteError
      ) {
        throw deleteError;
      }

      if (
        !generated.length
      ) {
        applyStudyPlanState(
          []
        );

        return [];
      }

      const rows =
        generated.map(
          session => ({
            user_id:
              user.id,

            subject_id:
              subjectIdByName.get(
                session.subject
              ) ??
              null,

            title:
              `Study ${session.subject}`,

            scheduled_date:
              getScheduledDateForDay(
                session.day
              ),

            start_time:
              session.startTime,

            end_time:
              session.endTime,

            duration_minutes:
              session.durationMinutes,

            status:
              'planned',

            notes:
              session.reason,

            color:
              null,
          })
        );

      const {
        data:
          savedRows,
        error:
          insertError,
      } =
        await supabase
          .from(
            'study_plans'
          )
          .insert(
            rows
          )
          .select(
            '*'
          );

      if (
        insertError
      ) {
        throw insertError;
      }

      const savedPlan:
        StudyPlanSession[] =
        (
          savedRows ??
          []
        ).map(
          (
            row,
            index
          ) => {
            const source =
              generated[
                index
              ];

            const scheduledDate =
              String(
                row.scheduled_date ??
                  ''
              ).slice(
                0,
                10
              );

            return {
              id:
                row.id,

              day:
                getDayNameFromDate(
                  scheduledDate
                ) ||
                source.day,

              subject:
                source.subject,

              startTime:
                String(
                  row.start_time ??
                    source.startTime
                ).slice(
                  0,
                  5
                ),

              endTime:
                String(
                  row.end_time ??
                    source.endTime
                ).slice(
                  0,
                  5
                ),

              durationMinutes:
                Number(
                  row.duration_minutes ??
                    source.durationMinutes
                ),

              reason:
                String(
                  row.notes ??
                    source.reason
                ),

              assessmentId:
                source.assessmentId,
            };
          }
        );

      applyStudyPlanState(
        savedPlan
      );

      return savedPlan;
    };

  const getSubjectClasses =
    (
      subject:
        string
    ) =>
      classes
        .filter(
          item =>
            item.subject ===
            subject
        )
        .sort(
          (
            a,
            b
          ) =>
            a.day.localeCompare(
              b.day
            )
        );

  const openAssessmentModal =
    () => {
      setAssessmentSubject(
        subjects[0] ||
          ''
      );

      setAssessmentType(
        'Exam'
      );

      setAssessmentDate(
        ''
      );

      setTopics(
        []
      );

      setNewTopic(
        ''
      );

      setError(
        ''
      );

      setShowAssessmentModal(
        true
      );
    };

  const addTopic =
    () => {
      const clean =
        newTopic.trim();

      if (
        clean &&
        !topics.includes(
          clean
        )
      ) {
        setTopics(
          previous => [
            ...previous,
            clean,
          ]
        );
      }

      setNewTopic(
        ''
      );
    };

  const addAssessment =
    async () => {
      if (
        !assessmentSubject
      ) {
        setError(
          'Please select a subject.'
        );

        return;
      }

      if (
        !assessmentDate
      ) {
        setError(
          'Please select the assessment date.'
        );

        return;
      }

      try {
        setError(
          ''
        );

        const {
          data: {
            user,
          },
          error:
            userError,
        } =
          await supabase.auth.getUser();

        if (
          userError
        ) {
          throw userError;
        }

        if (!user) {
          throw new Error(
            'You are not signed in. Please sign in again.'
          );
        }

        const {
          data:
            subjectRow,
          error:
            subjectError,
        } =
          await supabase
            .from(
              'subjects'
            )
            .select(
              'id, name'
            )
            .eq(
              'user_id',
              user.id
            )
            .eq(
              'name',
              assessmentSubject
            )
            .maybeSingle();

        if (
          subjectError
        ) {
          throw subjectError;
        }

        const base = {
          user_id:
            user.id,

          subject_id:
            subjectRow
              ?.id ??
            null,

          subject:
            assessmentSubject,
        };

        const candidates: Record<string, unknown>[] = [
            {
              ...base,
              assessment_type:
                assessmentType,
              assessment_date:
                assessmentDate,
            },
            {
              ...base,
              type:
                assessmentType,
              due_date:
                assessmentDate,
            },
            {
              ...base,
              assessment_type:
                assessmentType,
              due_date:
                assessmentDate,
            },
            {
              ...base,
              type:
                assessmentType,
              assessment_date:
                assessmentDate,
            },
          ];

        let saved:
          any =
          null;

        let lastError:
          any =
          null;

        for (
          const payload of
            candidates
        ) {
          const {
            data,
            error:
              insertError,
          } =
            await supabase
              .from(
                'assessments'
              )
              .insert(
                payload
              )
              .select(
                '*'
              )
              .single();

          if (
            !insertError
          ) {
            saved =
              data;

            lastError =
              null;

            break;
          }

          lastError =
            insertError;
        }

        if (!saved) {
          throw (
            lastError ??
            new Error(
              'Could not save the assessment.'
            )
          );
        }

        let savedTopics:
          any[] = [];

        if (
          topics.length
        ) {
          const withUser =
            topics.map(
              name => ({
                user_id:
                  user.id,

                assessment_id:
                  saved.id,

                name,

                done:
                  false,
              })
            );

          const withoutUser =
            topics.map(
              name => ({
                assessment_id:
                  saved.id,

                name,

                done:
                  false,
              })
            );

          let topicError:
            any =
            null;

          for (
            const payload of
              [
                withUser,
                withoutUser,
              ]
          ) {
            const {
              data,
              error:
                insertTopicError,
            } =
              await supabase
                .from(
                  'assessment_topics'
                )
                .insert(
                  payload
                )
                .select(
                  '*'
                );

            if (
              !insertTopicError
            ) {
              savedTopics =
                data ??
                [];

              topicError =
                null;

              break;
            }

            topicError =
              insertTopicError;
          }

          if (
            topicError
          ) {
            await supabase
              .from(
                'assessments'
              )
              .delete()
              .eq(
                'id',
                saved.id
              )
              .eq(
                'user_id',
                user.id
              );

            throw topicError;
          }
        }

        const style =
          SUBJECT_STYLES[
            Math.max(
              0,
              subjects.indexOf(
                assessmentSubject
              )
            ) %
              SUBJECT_STYLES.length
          ];

        const newAssessment:
          Assessment =
          {
            id:
              saved.id,

            subject:
              assessmentSubject,

            dotColor:
              style.dotColor,

            type:
              assessmentType,

            daysLeft:
              calculateDaysLeft(
                assessmentDate
              ),

            topics:
              topics.map(
                name => ({
                  name,
                  done:
                    false,
                })
              ),

            progress:
              0,
          };

        const nextAssessments =
          [
            ...assessments,
            newAssessment,
          ];

        const nextDates =
          {
            ...assessmentDates,
            [saved.id]:
              assessmentDate,
          };

        const nextRowIds =
          {
            ...topicRowIds,
          };

        savedTopics.forEach(
          row => {
            const name =
              String(
                row.name ??
                  row.topic ??
                  row.title ??
                  ''
              );

            if (name) {
              nextRowIds[
                `${saved.id}::${name}`
              ] =
                row.id;
            }
          }
        );

        applyAssessmentState(
          nextAssessments,
          nextDates
        );

        setTopicRowIds(
          nextRowIds
        );

        setShowAssessmentModal(
          false
        );
      } catch (
        saveError
      ) {
        console.error(
          'Failed to save assessment:',
          saveError
        );

        setError(
          saveError instanceof
            Error
            ? saveError.message
            : 'Could not save the assessment.'
        );
      }
    };

  const deleteAssessment =
    async (
      id: string
    ) => {
      try {
        const {
          data: {
            user,
          },
          error:
            userError,
        } =
          await supabase.auth.getUser();

        if (
          userError
        ) {
          throw userError;
        }

        if (!user) {
          throw new Error(
            'You are not signed in. Please sign in again.'
          );
        }

        const {
          error:
            topicError,
        } =
          await supabase
            .from(
              'assessment_topics'
            )
            .delete()
            .eq(
              'assessment_id',
              id
            );

        if (
          topicError
        ) {
          throw topicError;
        }

        const {
          error:
            deleteError,
        } =
          await supabase
            .from(
              'assessments'
            )
            .delete()
            .eq(
              'id',
              id
            )
            .eq(
              'user_id',
              user.id
            );

        if (
          deleteError
        ) {
          throw deleteError;
        }

        const nextAssessments =
          assessments.filter(
            item =>
              item.id !==
              id
          );

        const nextDates =
          {
            ...assessmentDates,
          };

        delete nextDates[
          id
        ];

        applyAssessmentState(
          nextAssessments,
          nextDates
        );

        setTopicRowIds(
          Object.fromEntries(
            Object.entries(
              topicRowIds
            ).filter(
              ([
                key,
              ]) =>
                !key.startsWith(
                  `${id}::`
                )
            )
          )
        );

        setAssessmentPendingDelete(
          null
        );
      } catch (
        deleteError
      ) {
        console.error(
          'Failed to delete assessment:',
          deleteError
        );

        setError(
          deleteError instanceof
            Error
            ? deleteError.message
            : 'Could not delete the assessment.'
        );

        setAssessmentPendingDelete(
          null
        );
      }
    };

  const toggleTopic =
    async (
      assessmentId:
        string,
      topicName:
        string
    ) => {
      const assessment =
        assessments.find(
          item =>
            item.id ===
            assessmentId
        );

      const topic =
        assessment
          ?.topics.find(
            item =>
              item.name ===
              topicName
          );

      const rowId =
        topicRowIds[
          `${assessmentId}::${topicName}`
        ];

      if (
        !assessment ||
        !topic ||
        !rowId
      ) {
        setError(
          'Could not find this topic in Supabase. Refresh and try again.'
        );

        return;
      }

      const nextDone =
        !topic.done;

      try {
        let updateError =
          (
            await supabase
              .from(
                'assessment_topics'
              )
              .update({
                done:
                  nextDone,
              })
              .eq(
                'id',
                rowId
              )
          ).error;

        if (
          updateError
        ) {
          updateError =
            (
              await supabase
                .from(
                  'assessment_topics'
                )
                .update({
                  completed:
                    nextDone,
                })
                .eq(
                  'id',
                  rowId
                )
            ).error;
        }

        if (
          updateError
        ) {
          throw updateError;
        }

        const updated =
          assessments.map(
            item => {
              if (
                item.id !==
                assessmentId
              ) {
                return item;
              }

              const updatedTopics =
                item.topics.map(
                  current =>
                    current.name ===
                    topicName
                      ? {
                          ...current,
                          done:
                            nextDone,
                        }
                      : current
                );

              const completed =
                updatedTopics.filter(
                  current =>
                    current.done
                ).length;

              return {
                ...item,

                topics:
                  updatedTopics,

                progress:
                  updatedTopics.length
                    ? Math.round(
                        (
                          completed /
                          updatedTopics.length
                        ) *
                          100
                      )
                    : 0,
              };
            }
          );

        applyAssessmentState(
          updated,
          assessmentDates
        );
      } catch (
        toggleError
      ) {
        console.error(
          'Failed to update topic:',
          toggleError
        );

        setError(
          toggleError instanceof
            Error
            ? toggleError.message
            : 'Could not update this topic.'
        );
      }
    };

  const sortedAssessments =
    useMemo(
      () =>
        [
          ...assessments,
        ].sort(
          (
            a,
            b
          ) => {
            const aDate =
              assessmentDates[
                a.id
              ] ||
              '';

            const bDate =
              assessmentDates[
                b.id
              ] ||
              '';

            if (
              !aDate &&
              !bDate
            ) {
              return 0;
            }

            if (!aDate) {
              return 1;
            }

            if (!bDate) {
              return -1;
            }

            return aDate.localeCompare(
              bDate
            );
          }
        ),
      [
        assessments,
        assessmentDates,
      ]
    );

  const getSubjectProgress =
    (
      subject:
        string
    ) => {
      const related =
        assessments.filter(
          item =>
            item.subject ===
            subject
        );

      if (
        !related.length
      ) {
        return 0;
      }

      return Math.round(
        related.reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.progress,
          0
        ) /
          related.length
      );
    };

  const generateStudyPlan =
    async () => {
      if (
        !subjects.length
      ) {
        setPlannerMessage(
          'Add at least one subject before generating a study plan.'
        );

        return;
      }

      const totalMinutes =
        Math.max(
          weeklyStudyGoal *
            60,
          60
        );

      const scores =
        subjects.map(
          subject => ({
            subject,

            score:
              getSubjectPriorityScore(
                subject,
                assessments,
                assessmentDates
              ),
          })
        );

      const totalScore =
        scores.reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.score,
          0
        );

      const remaining =
        scores.map(
          item => ({
            subject:
              item.subject,

            minutes:
              Math.max(
                30,
                Math.round(
                  (
                    item.score /
                    totalScore
                  ) *
                    totalMinutes
                )
              ),
          })
        );

      const dayWindows =
        DAYS.map(
          day => {
            const busy:
              TimeBlock[] =
              [];

            classes
              .filter(
                item =>
                  item.day ===
                  day
              )
              .forEach(
                item =>
                  busy.push({
                    start:
                      timeToMinutes(
                        item.startTime
                      ),

                    end:
                      timeToMinutes(
                        item.endTime
                      ),
                  })
              );

            routines
              .filter(
                item =>
                  item.type ===
                    'fixed' &&
                  item.days.includes(
                    day
                  ) &&
                  item.startTime &&
                  item.endTime
              )
              .forEach(
                item =>
                  busy.push({
                    start:
                      timeToMinutes(
                        item.startTime!
                      ),

                    end:
                      timeToMinutes(
                        item.endTime!
                      ),
                  })
              );

            const preferred =
              studyPreferences.length
                ? studyPreferences.map(
                    item => ({
                      start:
                        timeToMinutes(
                          item.startTime
                        ),

                      end:
                        timeToMinutes(
                          item.endTime
                        ),
                    })
                  )
                : [
                    {
                      start:
                        18 *
                        60,

                      end:
                        22 *
                        60,
                    },
                  ];

            return {
              day,

              freeBlocks:
                preferred.flatMap(
                  window =>
                    getFreeBlocks(
                      window.start,
                      window.end,
                      busy
                    )
                ),
            };
          }
        );

      const generated:
        StudyPlanSession[] =
        [];

      let safety = 0;

      while (
        remaining.some(
          item =>
            item.minutes >
            0
        ) &&
        safety <
          200
      ) {
        safety += 1;

        const next =
          [
            ...remaining,
          ]
            .filter(
              item =>
                item.minutes >
                0
            )
            .sort(
              (
                a,
                b
              ) =>
                b.minutes -
                a.minutes
            )[0];

        if (!next) {
          break;
        }

        const related =
          sortedAssessments.find(
            item =>
              item.subject ===
                next.subject &&
              calculateDaysLeft(
                assessmentDates[
                  item.id
                ] ||
                  ''
              ) >=
                0
          );

        const preferredLength =
          Math.min(
            next.minutes,
            next.minutes >=
              60
              ? 60
              : next.minutes >=
                45
              ? 45
              : 30
          );

        let placed =
          false;

        for (
          const day of
            dayWindows
        ) {
          for (
            const block of
              day.freeBlocks
          ) {
            const available =
              block.end -
              block.start;

            if (
              available <
              30
            ) {
              continue;
            }

            const length =
              Math.min(
                preferredLength,
                available
              );

            if (
              length <
              30
            ) {
              continue;
            }

            const start =
              block.start;

            const end =
              start +
              length;

            const daysLeft =
              related
                ? calculateDaysLeft(
                    assessmentDates[
                      related.id
                    ] ||
                      ''
                  )
                : 0;

            const reason =
              related
                ? `${related.type} in ${
                    daysLeft <=
                    0
                      ? 'less than a day'
                      : `${daysLeft} day${
                          daysLeft ===
                          1
                            ? ''
                            : 's'
                        }`
                  } · ${related.progress}% prepared`
                : 'Weekly study goal';

            generated.push({
              id:
                createId(),

              day:
                day.day,

              subject:
                next.subject,

              startTime:
                minutesToTime(
                  start
                ),

              endTime:
                minutesToTime(
                  end
                ),

              durationMinutes:
                length,

              reason,

              assessmentId:
                related?.id,
            });

            block.start =
              end;

            next.minutes -=
              length;

            const original =
              remaining.find(
                item =>
                  item.subject ===
                  next.subject
              );

            if (
              original
            ) {
              original.minutes =
                next.minutes;
            }

            placed =
              true;

            break;
          }

          if (
            placed
          ) {
            break;
          }
        }

        if (
          !placed
        ) {
          const original =
            remaining.find(
              item =>
                item.subject ===
                next.subject
            );

          if (
            original
          ) {
            original.minutes =
              0;
          }
        }
      }

      try {
        setSavingStudyPlan(
          true
        );

        setError(
          ''
        );

        await saveStudyPlanToSupabase(
          generated
        );
      } catch (
        saveError
      ) {
        console.error(
          'Failed to save study plan:',
          saveError
        );

        setError(
          saveError instanceof
            Error
            ? saveError.message
            : 'Could not save the study plan.'
        );

        return;
      } finally {
        setSavingStudyPlan(
          false
        );
      }

      const plannedMinutes =
        generated.reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.durationMinutes,
          0
        );

      if (
        !generated.length
      ) {
        setPlannerMessage(
          'No study sessions could fit inside your preferred study windows.'
        );
      } else if (
        plannedMinutes <
        totalMinutes
      ) {
        setPlannerMessage(
          `I scheduled ${
            Math.round(
              (
                plannedMinutes /
                60
              ) *
                10
            ) /
            10
          }h of your ${weeklyStudyGoal}h weekly goal.`
        );
      } else {
        setPlannerMessage(
          `Your ${weeklyStudyGoal}h weekly study goal has been distributed across your available study windows.`
        );
      }
    };

  const clearStudyPlan =
    async () => {
      try {
        setSavingStudyPlan(
          true
        );

        setError(
          ''
        );

        await saveStudyPlanToSupabase(
          []
        );

        setPlannerMessage(
          ''
        );

        setShowClearPlanConfirm(
          false
        );
      } catch (
        clearError
      ) {
        console.error(
          'Failed to clear study plan:',
          clearError
        );

        setError(
          clearError instanceof
            Error
            ? clearError.message
            : 'Could not clear the study plan.'
        );
      } finally {
        setSavingStudyPlan(
          false
        );
      }
    };

  const groupedStudyPlan =
    DAYS.map(
      day => ({
        day,

        sessions:
          studyPlan
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
            ),
      })
    ).filter(
      group =>
        group.sessions.length
    );

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h1 className="font-display font-800 text-2xl text-slate-900 dark:text-white">
            Academics
          </h1>

          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {subjects.length}{' '}
            {subjects.length ===
            1
              ? 'subject'
              : 'subjects'}
            {' · '}
            {semester}
          </p>

        </div>

        {tab ===
          'assessments' && (
          <button
            type="button"
            onClick={
              openAssessmentModal
            }
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl"
          >
            <Plus
              size={14}
            />
            Add Assessment
          </button>
        )}

      </div>

      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-7 w-fit">

        {(
          [
            'overview',
            'assessments',
            'planner',
          ] as AcadTab[]
        ).map(
          current => (
            <button
              key={
                current
              }
              type="button"
              onClick={() =>
                setTab(
                  current
                )
              }
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab ===
                current
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {current ===
              'planner'
                ? 'Study Planner'
                : current
                    .charAt(
                      0
                    )
                    .toUpperCase() +
                  current.slice(
                    1
                  )}
            </button>
          )
        )}

      </div>

      {error && (
        <div className="mb-5 flex gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-3">

          <AlertCircle
            size={15}
            className="text-red-500 mt-0.5"
          />

          <p className="text-xs text-red-600 dark:text-red-400 flex-1">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              setError(
                ''
              )
            }
          >
            <X
              size={13}
              className="text-red-400"
            />
          </button>

        </div>
      )}

      {tab ===
        'overview' && (
        subjects.length ===
        0 ? (
          <div className="text-center py-16 text-slate-400">
            No subjects added yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {subjects.map(
              (
                subject,
                index
              ) => {
                const style =
                  SUBJECT_STYLES[
                    index %
                      SUBJECT_STYLES.length
                  ];

                const subjectClasses =
                  getSubjectClasses(
                    subject
                  );

                const firstClass =
                  subjectClasses[
                    0
                  ];

                const progress =
                  getSubjectProgress(
                    subject
                  );

                const count =
                  assessments.filter(
                    item =>
                      item.subject ===
                      subject
                  ).length;

                return (
                  <div
                    key={
                      subject
                    }
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md transition-all group"
                  >

                    <div className="flex items-start justify-between mb-4">

                      <div
                        className={`w-10 h-10 rounded-xl ${style.bgLight} flex items-center justify-center`}
                      >
                        <BookOpen
                          size={
                            18
                          }
                          className={
                            style.textColor
                          }
                        />
                      </div>

                      <div
                        className={`w-2.5 h-2.5 rounded-full ${style.dotColor} mt-1`}
                      />

                    </div>

                    <h3 className="font-display font-600 text-base text-slate-900 dark:text-white mb-3">
                      {subject}
                    </h3>

                    <div className="space-y-2 mb-4 text-xs text-slate-500 dark:text-slate-400">

                      <div className="flex items-center gap-2">

                        <Clock
                          size={
                            11
                          }
                        />

                        {firstClass
                          ? `${firstClass.day} · ${formatTime(
                              firstClass.startTime
                            )}`
                          : 'No classes scheduled'}

                      </div>

                      {firstClass && (
                        <div className="flex items-center gap-2">

                          <MapPin
                            size={
                              11
                            }
                          />

                          {firstClass.venue?.trim() ||
                            'Venue not set'}

                        </div>
                      )}

                      {firstClass && (
                        <div className="flex items-center gap-2">

                          <UserRound
                            size={
                              11
                            }
                          />

                          {firstClass.lecturer?.trim() ||
                            'Lecturer not set'}

                        </div>
                      )}

                      <div className="flex items-center gap-2">

                        <GraduationCap
                          size={
                            11
                          }
                        />

                        {count}{' '}
                        {count ===
                        1
                          ? 'assessment'
                          : 'assessments'}

                      </div>

                    </div>

                    <div className="flex justify-between text-xs mb-1.5">

                      <span className="text-slate-400">
                        Assessment progress
                      </span>

                      <span
                        className={`font-semibold ${style.textColor}`}
                      >
                        {progress}%
                      </span>

                    </div>

                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">

                      <div
                        className={`h-1.5 rounded-full ${style.dotColor}`}
                        style={{
                          width:
                            `${progress}%`,
                        }}
                      />

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setTab(
                          'assessments'
                        )
                      }
                      className={`flex items-center gap-1 text-xs font-medium mt-3 ${style.textColor}`}
                    >
                      View Assessments
                      <ChevronRight
                        size={
                          12
                        }
                      />
                    </button>

                  </div>
                );
              }
            )}

          </div>
        )
      )}

      {tab ===
        'assessments' && (
        loadingAssessments ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center">

            <RefreshCw
              size={
                22
              }
              className="mx-auto text-indigo-500 animate-spin mb-3"
            />

            <p className="text-sm text-slate-500">
              Loading assessments...
            </p>

          </div>
        ) : sortedAssessments.length ===
        0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">

            <GraduationCap
              size={
                28
              }
              className="mx-auto text-indigo-500 mb-3"
            />

            <h2 className="font-display font-700 text-lg">
              No assessments added yet
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Add exams, tests, CAs, quizzes, assignments and other academic deadlines.
            </p>

            <button
              type="button"
              onClick={
                openAssessmentModal
              }
              className="inline-flex items-center gap-2 mt-5 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm"
            >
              <Plus
                size={
                  14
                }
              />
              Add Assessment
            </button>

          </div>
        ) : (
          <div className="space-y-4">

            {sortedAssessments.map(
              assessment => {
                const date =
                  assessmentDates[
                    assessment.id
                  ] ||
                  '';

                const daysLeft =
                  date
                    ? calculateDaysLeft(
                        date
                      )
                    : assessment.daysLeft;

                return (
                  <div
                    key={
                      assessment.id
                    }
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div className="flex items-start gap-3">

                        <div
                          className={`w-3 h-3 rounded-full ${assessment.dotColor} mt-1.5`}
                        />

                        <div>

                          <div className="flex items-center gap-2 flex-wrap">

                            <h3 className="font-display font-600 text-base">
                              {assessment.subject}
                            </h3>

                            <span className="text-xs bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 px-2 py-0.5 rounded-full">
                              {assessment.type}
                            </span>

                          </div>

                          <div className="flex items-center gap-3 mt-1 flex-wrap text-xs">

                            <span className="flex items-center gap-1 text-slate-500">

                              <Calendar
                                size={
                                  11
                                }
                              />

                              {formatAssessmentDate(
                                date
                              )}

                            </span>

                            <span
                              className={
                                daysLeft <
                                0
                                  ? 'text-red-500'
                                  : daysLeft <=
                                    3
                                  ? 'text-amber-500'
                                  : 'text-slate-400'
                              }
                            >
                              {daysLeft <
                              0
                                ? `${Math.abs(
                                    daysLeft
                                  )} days overdue`
                                : daysLeft ===
                                  0
                                ? 'Today'
                                : daysLeft ===
                                  1
                                ? 'Tomorrow'
                                : `${daysLeft} days left`}
                            </span>

                          </div>

                        </div>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setAssessmentPendingDelete(
                            assessment
                          )
                        }
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2
                          size={
                            15
                          }
                        />
                      </button>

                    </div>

                    <div className="mt-5">

                      <div className="flex justify-between text-xs mb-2">

                        <span className="text-slate-500">
                          Preparation progress
                        </span>

                        <span className="font-semibold text-indigo-600">
                          {assessment.progress}%
                        </span>

                      </div>

                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full">

                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{
                            width:
                              `${assessment.progress}%`,
                          }}
                        />

                      </div>

                    </div>

                    {assessment.topics.length >
                      0 && (
                      <div className="mt-5 space-y-2">

                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Topics
                        </p>

                        {assessment.topics.map(
                          topic => (
                            <button
                              key={
                                topic.name
                              }
                              type="button"
                              onClick={() =>
                                void toggleTopic(
                                  assessment.id,
                                  topic.name
                                )
                              }
                              className="w-full flex items-center gap-3 text-left bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2.5"
                            >

                              <div
                                className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                                  topic.done
                                    ? 'bg-indigo-600 border-indigo-600'
                                    : 'border-slate-300 dark:border-slate-600'
                                }`}
                              >
                                {topic.done && (
                                  <Check
                                    size={
                                      11
                                    }
                                    className="text-white"
                                  />
                                )}
                              </div>

                              <span
                                className={`text-sm ${
                                  topic.done
                                    ? 'line-through text-slate-400'
                                    : 'text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {topic.name}
                              </span>

                            </button>
                          )
                        )}

                      </div>
                    )}

                  </div>
                );
              }
            )}

          </div>
        )
      )}

      {tab ===
        'planner' && (
        <div>

          <div className="flex items-start justify-between gap-3 mb-6">

            <div>

              <h2 className="font-display font-700 text-xl">
                Study Planner
              </h2>

              <p className="text-slate-500 text-sm mt-0.5">
                Study time distributed around your classes, routines and preferred study periods.
              </p>

            </div>

            {studyPlan.length >
              0 && (
              <div className="flex gap-2">

                <button
                  type="button"
                  onClick={() =>
                    void generateStudyPlan()
                  }
                  disabled={
                    savingStudyPlan
                  }
                  className="inline-flex items-center gap-2 border border-indigo-200 text-indigo-600 text-sm px-4 py-2 rounded-xl disabled:opacity-50"
                >
                  <RefreshCw
                    size={
                      14
                    }
                  />
                  Regenerate
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowClearPlanConfirm(
                      true
                    )
                  }
                  disabled={
                    savingStudyPlan
                  }
                  className="inline-flex items-center gap-2 border border-slate-200 text-slate-500 text-sm px-4 py-2 rounded-xl disabled:opacity-50"
                >
                  <Trash2
                    size={
                      14
                    }
                  />
                  Clear
                </button>

              </div>
            )}

          </div>

          {loadingStudyPlan ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center">

              <RefreshCw
                size={
                  22
                }
                className="mx-auto text-indigo-500 animate-spin mb-3"
              />

              <p className="text-sm text-slate-500">
                Loading study plan...
              </p>

            </div>
          ) : studyPlan.length ===
          0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">

              <Sparkles
                size={
                  28
                }
                className="mx-auto text-violet-500 mb-3"
              />

              <h3 className="font-display font-700 text-lg">
                Build your study plan
              </h3>

              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                My Scheduler will prioritize urgent assessments, then distribute the rest of your weekly study goal.
              </p>

              <button
                type="button"
                onClick={() =>
                  void generateStudyPlan()
                }
                disabled={
                  savingStudyPlan
                }
                className="inline-flex items-center gap-2 mt-6 bg-indigo-600 disabled:bg-indigo-300 text-white px-5 py-2.5 rounded-xl text-sm"
              >
                {savingStudyPlan ? (
                  <RefreshCw
                    size={
                      14
                    }
                    className="animate-spin"
                  />
                ) : (
                  <Sparkles
                    size={
                      14
                    }
                  />
                )}

                {savingStudyPlan
                  ? 'Saving Plan...'
                  : 'Generate Study Plan'}
              </button>

              {plannerMessage && (
                <p className="text-xs text-amber-600 mt-4">
                  {plannerMessage}
                </p>
              )}

            </div>
          ) : (
            <div className="space-y-5">

              {plannerMessage && (
                <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 rounded-xl px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300">
                  {plannerMessage}
                </div>
              )}

              {groupedStudyPlan.map(
                group => (
                  <div
                    key={
                      group.day
                    }
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5"
                  >

                    <h3 className="font-display font-700 text-base mb-4">
                      {group.day}
                    </h3>

                    <div className="space-y-3">

                      {group.sessions.map(
                        session => (
                          <div
                            key={
                              session.id
                            }
                            className="flex items-start justify-between gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-4"
                          >

                            <div>

                              <p className="text-sm font-semibold">
                                {session.subject}
                              </p>

                              <p className="text-xs text-slate-400 mt-0.5">
                                {session.reason}
                              </p>

                            </div>

                            <span className="text-xs font-mono text-slate-500 whitespace-nowrap">
                              {formatTime(
                                session.startTime
                              )}{' '}
                              –{' '}
                              {formatTime(
                                session.endTime
                              )}
                            </span>

                          </div>
                        )
                      )}

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </div>
      )}

      {showAssessmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() =>
              setShowAssessmentModal(
                false
              )
            }
          />

          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6">

            <div className="flex items-center justify-between mb-5">

              <div>

                <h2 className="font-display font-700 text-xl">
                  Add Assessment
                </h2>

                <p className="text-xs text-slate-400 mt-0.5">
                  Add an exam, test, assignment or other academic deadline.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAssessmentModal(
                    false
                  )
                }
              >
                <X
                  size={
                    16
                  }
                />
              </button>

            </div>

            <div className="space-y-4">

              <div>

                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Subject
                </label>

                <select
                  value={
                    assessmentSubject
                  }
                  onChange={
                    e =>
                      setAssessmentSubject(
                        e.target.value
                      )
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm"
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
                        {subject}
                      </option>
                    )
                  )}

                </select>

              </div>

              <div className="grid grid-cols-2 gap-3">

                <div>

                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Assessment Type
                  </label>

                  <select
                    value={
                      assessmentType
                    }
                    onChange={
                      e =>
                        setAssessmentType(
                          e.target.value
                        )
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm"
                  >

                    {ASSESSMENT_TYPES.map(
                      type => (
                        <option
                          key={
                            type
                          }
                          value={
                            type
                          }
                        >
                          {type}
                        </option>
                      )
                    )}

                  </select>

                </div>

                <div>

                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Date
                  </label>

                  <input
                    type="date"
                    value={
                      assessmentDate
                    }
                    onChange={
                      e =>
                        setAssessmentDate(
                          e.target.value
                        )
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm"
                  />

                </div>

              </div>

              <div>

                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Topics to Prepare
                </label>

                <div className="flex gap-2">

                  <input
                    value={
                      newTopic
                    }
                    onChange={
                      e =>
                        setNewTopic(
                          e.target.value
                        )
                    }
                    onKeyDown={
                      e => {
                        if (
                          e.key ===
                          'Enter'
                        ) {
                          e.preventDefault();
                          addTopic();
                        }
                      }
                    }
                    placeholder="e.g. Normalization"
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm"
                  />

                  <button
                    type="button"
                    onClick={
                      addTopic
                    }
                    className="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-xl"
                  >
                    <Plus
                      size={
                        15
                      }
                    />
                  </button>

                </div>

                {topics.length >
                  0 && (
                  <div className="flex flex-wrap gap-2 mt-3">

                    {topics.map(
                      topic => (
                        <span
                          key={
                            topic
                          }
                          className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-xs rounded-full px-3 py-1.5"
                        >

                          {topic}

                          <button
                            type="button"
                            onClick={() =>
                              setTopics(
                                current =>
                                  current.filter(
                                    item =>
                                      item !==
                                      topic
                                  )
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

              </div>

            </div>

            <div className="flex gap-3 mt-6">

              <button
                type="button"
                onClick={() =>
                  setShowAssessmentModal(
                    false
                  )
                }
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  void addAssessment()
                }
                disabled={
                  !subjects.length
                }
                className="flex-1 bg-indigo-600 disabled:bg-slate-300 text-white py-2.5 rounded-xl text-sm font-semibold"
              >
                Add Assessment
              </button>

            </div>

          </div>

        </div>
      )}

      {assessmentPendingDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">

          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() =>
              setAssessmentPendingDelete(
                null
              )
            }
          />

          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">

            <Trash2
              size={
                20
              }
              className="text-red-600 mb-4"
            />

            <h2 className="font-display font-700 text-xl">
              Delete assessment?
            </h2>

            <p className="text-sm text-slate-500 mt-2">
              Delete “{assessmentPendingDelete.subject} · {assessmentPendingDelete.type}”? Its topics and progress will also be removed.
            </p>

            <div className="flex gap-3 mt-6">

              <button
                type="button"
                onClick={() =>
                  setAssessmentPendingDelete(
                    null
                  )
                }
                className="flex-1 border border-slate-200 py-2.5 rounded-xl text-sm"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  void deleteAssessment(
                    assessmentPendingDelete.id
                  )
                }
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold"
              >
                Delete Assessment
              </button>

            </div>

          </div>

        </div>
      )}

      {showClearPlanConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">

          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() =>
              setShowClearPlanConfirm(
                false
              )
            }
          />

          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">

            <Trash2
              size={
                20
              }
              className="text-red-600 mb-4"
            />

            <h2 className="font-display font-700 text-xl">
              Clear study plan?
            </h2>

            <p className="text-sm text-slate-500 mt-2">
              This will remove all {studyPlan.length} study sessions. You can generate a new plan later.
            </p>

            <div className="flex gap-3 mt-6">

              <button
                type="button"
                onClick={() =>
                  setShowClearPlanConfirm(
                    false
                  )
                }
                className="flex-1 border border-slate-200 py-2.5 rounded-xl text-sm"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  void clearStudyPlan()
                }
                disabled={
                  savingStudyPlan
                }
                className="flex-1 bg-red-600 disabled:bg-red-300 text-white py-2.5 rounded-xl text-sm font-semibold"
              >
                Clear Plan
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}