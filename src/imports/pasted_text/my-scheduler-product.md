Yep. Now that we’ve expanded the concept beyond academics, I’d actually **replace the previous Figma prompt** rather than just add to it. This version makes My Scheduler feel like a full student-life scheduling product.

Design a polished, modern, responsive web application called **My Scheduler**.

## PRODUCT CONCEPT

**My Scheduler** is a smart personal scheduling and productivity platform designed primarily for students.

It combines:

* Academic scheduling
* Daily personal tasks
* Classes
* Assignments
* Exams and CAs
* Study planning
* Appointments
* Chores and errands
* Fitness and personal activities
* Events
* Goals
* Focus sessions

The core problem My Scheduler solves is:

**“I have many things to do, but I don't know what I should do, when I should do it, or how to fit everything into my day.”**

The application should not feel like a basic calendar or to-do list.

It should behave like an intelligent personal scheduling assistant that helps users organize their entire day and recommends what they should focus on next.

Product tagline:

**Plan school. Organize life. Know what to do next.**

---

# DESIGN DIRECTION

Create a clean, modern productivity SaaS interface aimed at university and college students.

The visual design should feel:

* Modern
* Calm
* Smart
* Friendly
* Motivating
* Organized
* Youthful without looking childish
* Minimal without feeling empty

Use:

* Soft off-white/light gray backgrounds
* White cards
* Rounded corners
* Subtle borders and shadows
* Purple/indigo as the main brand accent
* Soft category colors
* Modern sans-serif typography
* Simple line icons
* Generous whitespace
* Clear visual hierarchy
* Smooth hover states
* Subtle animations and micro-interactions

Support both light and dark mode.

Design desktop-first at approximately **1440px**, while keeping components responsive for tablets and mobile devices.

---

# 1. LANDING / WELCOME SCREEN

Create a welcoming first screen.

Logo:

**My Scheduler**

Headline:

**Take control of your day.**

Supporting text:

**Plan classes, tasks, study sessions and everyday life in one smart schedule.**

Primary CTA:

**Get Started**

Secondary CTA:

**Explore My Day**

Include a visual preview of the dashboard/calendar.

---

# 2. ONBOARDING

Create a simple multi-step onboarding flow.

Progress indicator:

**1 — About You**
**2 — Academics**
**3 — Routine**
**4 — Goals**
**5 — Ready**

### Step 1 — About You

Ask for:

* Name
* University/School
* Current semester
* Typical wake-up time
* Typical bedtime

### Step 2 — Academics

Allow users to add subjects.

Example subjects:

* Mathematics
* Programming
* Database Systems
* Physics
* Networking

Each subject gets its own color.

Allow users to add their recurring class timetable.

Fields:

* Subject
* Day
* Start time
* End time
* Location

### Step 3 — Important Academic Dates

Allow users to add:

* Assignments
* CAs
* Tests
* Exams
* Projects

Include deadline/date and priority.

### Step 4 — Personal Routine

Allow students to add recurring activities such as:

* Gym
* Church
* Work
* Cleaning
* Grocery shopping
* Clubs
* Sports
* Meal preparation
* Personal projects

Ask whether each activity is:

**Fixed Time**

or

**Flexible**

### Step 5 — Goals

Ask questions such as:

**How many hours would you like to study each week?**

**How many days per week do you want to exercise?**

**Do you prefer studying in the morning, afternoon or evening?**

Finish with:

**Build My Schedule**

---

# 3. MAIN APPLICATION NAVIGATION

Create a clean left sidebar.

Include:

* My Scheduler logo
* Dashboard
* My Day
* Calendar
* Academics
* Tasks
* Focus
* Progress

Bottom section:

* Settings
* Help
* User profile/avatar

Top navigation should contain:

* Search
* Notifications
* Quick Add button
* Light/Dark mode
* Profile

---

# 4. DASHBOARD

The dashboard should immediately answer:

**“What does my day look like and what should I do next?”**

Header:

**Good afternoon, Alex 👋**

Subtitle:

**You have 2 classes, 3 tasks and 4h 30m of flexible time today.**

Include the current date.

---

# 5. FOCUS NOW

Make this one of the most visually important dashboard components.

Title:

**Focus Now**

Example:

**Recommended**

📚 Database Systems

**Review Normalization**

45 minutes

Supporting explanation:

**Your CA is in 5 days and you still have 3 topics to review. You have enough free time before your next class.**

Primary CTA:

**Start Focus Session**

Secondary CTA:

**Choose Something Else**

Also show:

**Next commitment: Programming Lecture at 4:00 PM**

This feature should visually communicate that My Scheduler intelligently selected this activity.

---

# 6. TODAY'S TIMELINE

Create a vertical timeline titled:

**Today**

Example:

**8:00 AM – 10:00 AM**
Database Systems
Class

**10:00 AM – 11:00 AM**
Free Time

**11:00 AM – 12:30 PM**
Mathematics
Tutorial

**1:00 PM – 2:00 PM**
Lunch

**2:00 PM – 2:45 PM**
Physics Revision
Study

**4:00 PM – 5:00 PM**
Gym
Personal

**6:30 PM**
Grocery Shopping
Task

Use visual differences for:

* Completed
* Happening now
* Upcoming
* Flexible
* Suggested

Clearly highlight the current time on the timeline.

---

# 7. SMART FREE TIME

Create a card titled:

**You have some free time**

Example:

**1h 20m available**

Before your next commitment at 4:00 PM.

Suggested activities:

**Review Calculus**
45 min

**Complete Programming Assignment**
60 min

**Gym**
45 min

**Take a Break**
30 min

Allow:

**Add to Schedule**

---

# 8. UPCOMING

Create a dashboard section showing important upcoming items.

Examples:

**Programming Assignment**
Due tomorrow

**Database Systems CA**
5 days

**Doctor Appointment**
Thursday · 3:30 PM

**Physics Exam**
18 days

Show subtle urgency indicators.

Allow:

**View All**

---

# 9. MY DAY PAGE

Create a dedicated daily planning interface.

Header:

**My Day**

Display:

**Monday, August 24**

At the top show:

**7 tasks**
**2 classes**
**3h 45m free**
**68% planned**

Create an hour-by-hour vertical timeline.

Users should be able to drag tasks into available time slots.

Include:

**+ Add Task**

**Auto Plan My Day**

The Auto Plan feature should automatically place flexible tasks into available time slots.

---

# 10. CALENDAR

Create a complete calendar interface.

Views:

**Day | Week | Month**

Weekly view should display Monday through Sunday.

Show:

* Classes
* Study sessions
* Personal activities
* Appointments
* Tasks
* Exams
* Events

Use category colors.

Allow users to:

* Drag events
* Resize events
* Edit events
* Create events
* Move flexible tasks

Include:

**+ Add Event**

---

# 11. QUICK ADD

Create a global Quick Add interaction.

When the user clicks:

**+ Add**

Open a clean modal.

Ask:

**What do you need to do?**

Example input:

**Finish Database Assignment**

Fields:

* Category
* Deadline
* Duration
* Priority

Then ask:

**When should this happen?**

Options:

**Fixed Time**

**Find Time For Me**

If the user selects:

**Find Time For Me**

My Scheduler should automatically suggest available time slots.

Example:

**Suggested Time**

Tuesday
4:30 PM – 5:30 PM

Buttons:

**Schedule It**

**See Other Times**

---

# 12. TASKS

Create a modern task management page.

Tabs:

**All | Today | Upcoming | Completed**

Task example:

☐ Finish Database Assignment

Database Systems

Due Tomorrow

Estimated: 1 hour

Priority: High

Allow:

* Complete
* Edit
* Reschedule
* Delete

Include:

**+ Add Task**

---

# 13. ACADEMICS

Create an Academics hub.

Show cards for:

* Subjects
* Assignments
* CAs
* Exams
* Study Plan

Example subject card:

**Database Systems**

Next class:
Tomorrow · 8:00 AM

Next assessment:
CA · 5 days

Study progress:
65%

CTA:

**View Subject**

---

# 14. EXAMS & CAs

Create an assessment dashboard.

Example:

**Database Systems**

CA 1

**5 DAYS LEFT**

Topics:

✓ ER Diagrams

✓ SQL Basics

○ Normalization

○ Transactions

Revision Progress:

**65%**

CTA:

**Continue Studying**

Include countdown indicators for upcoming assessments.

---

# 15. SMART STUDY PLANNER

Create a page titled:

**Study Planner**

Subtitle:

**We'll fit your study sessions around your life.**

Generate suggested sessions based on:

* Free time
* Upcoming exams
* Assignment deadlines
* Subject difficulty
* Topics remaining
* User study preferences

Example:

### Monday

**4:00 PM – 4:45 PM**

Mathematics

Integration

### Tuesday

**6:00 PM – 7:00 PM**

Database Systems

Normalization

Allow users to:

* Accept plan
* Regenerate plan
* Reschedule sessions
* Skip sessions

---

# 16. PROGRESS

Create a motivating productivity analytics page.

Show:

**This Week**

Study time:
**12h 40m**

Tasks completed:
**18**

Focus sessions:
**14**

Schedule completion:
**82%**

Current streak:
**6 days**

Include a clean weekly activity chart.

Also show:

**Academic Progress**

and

**Personal Goals**

Avoid making this page feel overly competitive or stressful.

---

# 17. NOTIFICATIONS

Design helpful notifications.

Examples:

**Database Systems CA is in 5 days.**

**You haven't studied Calculus in 4 days.**

**You have 90 minutes free before your next class. Want to schedule something?**

**Programming Assignment is due tomorrow.**

**Your afternoon is getting crowded. Consider moving your gym session to 6:00 PM.**

Notifications should feel helpful rather than annoying.

---

# 18. SMART SCHEDULING SYSTEM

Visually distinguish between two types of activities.

### Fixed

Activities that cannot easily move:

* Classes
* Exams
* Appointments
* Work shifts
* Events

Use a lock icon.

### Flexible

Activities that My Scheduler can intelligently move:

* Studying
* Gym
* Cleaning
* Shopping
* Assignments
* Personal projects

Use a flexible/move icon.

Allow the application to recommend moving flexible tasks when schedule conflicts occur.

---

# MOBILE EXPERIENCE

Design a responsive mobile version.

Bottom navigation:

**Home**
**My Day**
**+**
**Calendar**
**Focus**

The mobile home screen should prioritize:

1. What should I do now?
2. What's next?
3. Today's timeline
4. Upcoming deadlines
5. Available free time

Keep the mobile interface extremely clean and easy to use.

---

# MOST IMPORTANT UX PRINCIPLE

My Scheduler should NOT simply show users everything they need to do.

It should help them decide **when to do it.**

The user should constantly be able to answer:

**What should I do now?**

**What comes next?**

**What is urgent?**

**How much free time do I have?**

**What can I realistically accomplish today?**

**Am I prepared for my upcoming exams?**

The final product should feel like a combination of a smart calendar, student planner, task manager and personal scheduling assistant — presented through one simple, cohesive experience.

One thing I’d do differently in Figma: **don’t ask it to generate the entire product first.** Start with the **Dashboard + My Day + Quick Add** screens. Those three screens contain the core idea of My Scheduler. Once you love that design language, you can have Figma extend it to Academics, Calendar, Focus, and Progress.
