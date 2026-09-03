import { Sparkles, CalendarDays, CheckSquare, Zap, ArrowRight, Play } from 'lucide-react'

interface LandingProps {
  onStart: () => void
  onExplore: () => void
}

export default function Landing({ onStart, onExplore }: LandingProps) {
  return (
    <div className="min-h-full bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <CalendarDays size={16} className="text-white" />
          </div>
          <span className="font-display font-700 text-lg tracking-tight">My Scheduler</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onExplore}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Explore
          </button>
          <button
            onClick={onStart}
            className="text-sm bg-white/10 hover:bg-white/15 border border-white/20 px-4 py-2 rounded-lg transition-colors"
          >
            Sign in
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center pt-12 pb-20">
        <div className="inline-flex items-center gap-2 bg-indigo-500/15 border border-indigo-400/25 text-indigo-300 text-xs font-medium px-3.5 py-1.5 rounded-full mb-8">
          <Sparkles size={12} />
          Smart scheduling for students
        </div>

        <h1 className="font-display font-800 text-5xl sm:text-6xl lg:text-7xl leading-none tracking-tight max-w-3xl mb-6">
          Take control of<br />
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            your day.
          </span>
        </h1>

        <p className="text-slate-400 text-lg sm:text-xl max-w-xl leading-relaxed mb-10">
          Plan classes, tasks, study sessions and everyday life in one smart schedule.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mb-16">
          <button
            onClick={onStart}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-7 py-3.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-900/50 hover:shadow-indigo-900/70"
          >
            Get Started
            <ArrowRight size={15} />
          </button>
          <button
            onClick={onExplore}
            className="flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/15 px-7 py-3.5 rounded-xl text-sm font-medium transition-all"
          >
            <Play size={13} className="fill-current" />
            Explore My Day
          </button>
        </div>

        {/* Dashboard preview */}
        <div className="w-full max-w-4xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black/40 bg-slate-900/80 backdrop-blur">
          {/* Fake top bar */}
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/8 bg-slate-950/60">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
            <div className="flex-1 mx-4 h-6 bg-white/5 rounded-md" />
          </div>

          {/* Fake dashboard content */}
          <div className="flex h-64">
            {/* Fake sidebar */}
            <div className="w-44 border-r border-white/8 p-4 flex flex-col gap-2 bg-slate-950/40">
              {['Dashboard', 'My Day', 'Calendar', 'Academics', 'Tasks', 'Focus'].map((item, i) => (
                <div
                  key={item}
                  className={`h-7 rounded-lg flex items-center px-3 gap-2 ${i === 0 ? 'bg-indigo-600/30' : ''}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-indigo-400' : 'bg-slate-600'}`} />
                  <div className={`h-2 rounded-full w-16 ${i === 0 ? 'bg-indigo-400/60' : 'bg-slate-700'}`} />
                </div>
              ))}
            </div>

            {/* Fake content */}
            <div className="flex-1 p-5 grid grid-cols-3 gap-4">
              <div className="col-span-2 bg-gradient-to-br from-indigo-600/25 to-violet-600/15 border border-indigo-500/25 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-indigo-500/50" />
                  <div className="h-2.5 w-20 bg-indigo-400/50 rounded-full" />
                </div>
                <div className="h-3 w-36 bg-white/30 rounded-full" />
                <div className="h-2 w-48 bg-white/15 rounded-full" />
                <div className="h-2 w-40 bg-white/15 rounded-full" />
                <div className="mt-auto flex gap-2">
                  <div className="h-7 w-28 bg-indigo-500/60 rounded-lg" />
                  <div className="h-7 w-24 bg-white/10 rounded-lg" />
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {[80, 55, 95, 60].map((w, i) => (
                  <div key={i} className="bg-white/5 rounded-lg p-3">
                    <div className={`h-2 rounded-full bg-white/20 mb-1.5`} style={{ width: `${w}%` }} />
                    <div className="h-1.5 w-12 bg-white/10 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
          {[
            { icon: CalendarDays, label: 'Smart Calendar' },
            { icon: CheckSquare, label: 'Task Manager' },
            { icon: Zap, label: 'Focus Sessions' },
            { icon: Sparkles, label: 'AI Scheduling' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 bg-white/6 border border-white/10 text-slate-400 text-xs px-3.5 py-2 rounded-full"
            >
              <Icon size={12} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Tagline footer */}
      <div className="text-center pb-8 text-slate-600 text-xs">
        Plan school. Organize life. Know what to do next.
      </div>
    </div>
  )
}
