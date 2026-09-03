import { useState } from 'react'
import { supabase } from '../utils/supabase'
import {
  CalendarDays,
  Mail,
  Lock,
  User,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react'

interface AuthProps {
  onAuthenticated: () => void
}

export default function Auth({
  onAuthenticated,
}: AuthProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } =
          await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: name,
              },
            },
          })

        if (signUpError) {
          throw signUpError
        }

        if (data.session) {
          onAuthenticated()
        } else {
          setMessage(
            'Account created! Check your email and confirm your account before signing in.'
          )
        }
      } else {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          })

        if (signInError) {
          throw signInError
        }

        onAuthenticated()
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  function switchMode() {
    setMode(current =>
      current === 'login' ? 'signup' : 'login'
    )

    setPassword('')
    setShowPassword(false)
    setError('')
    setMessage('')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-600 flex items-center justify-center mb-4">
            <CalendarDays
              size={26}
              className="text-white"
            />
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            My Scheduler
          </h1>

          <p className="text-sm text-slate-500 mt-2">
            Organize your classes, study time and daily life.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-900">
            {mode === 'login'
              ? 'Welcome back'
              : 'Create your account'}
          </h2>

          <p className="text-sm text-slate-500 mt-1 mb-6">
            {mode === 'login'
              ? 'Sign in to continue to your scheduler.'
              : 'Create an account to start building your schedule.'}
          </p>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Name
                </label>

                <div className="relative">
                  <User
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={name}
                    onChange={event =>
                      setName(event.target.value)
                    }
                    required
                    placeholder="Enter your name"
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-3 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>

              <div className="relative">
                <Mail
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="email"
                  value={email}
                  onChange={event =>
                    setEmail(event.target.value)
                  }
                  required
                  placeholder="you@example.com"
                  className="w-full border border-slate-200 rounded-xl pl-10 pr-3 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>

              <div className="relative">
                <Lock
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={event =>
                    setPassword(event.target.value)
                  }
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  className="w-full border border-slate-200 rounded-xl pl-10 pr-11 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(current => !current)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                  title={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
            >
              {loading && (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              )}

              {loading
                ? 'Please wait...'
                : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-sm text-slate-500">
              {mode === 'login'
                ? "Don't have an account? "
                : 'Already have an account? '}
            </span>

            <button
              type="button"
              onClick={switchMode}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              {mode === 'login'
                ? 'Create account'
                : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
