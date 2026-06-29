'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Puzzle, Eye, EyeOff, Lock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!password || loading) return

    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json() as { success?: boolean; error?: string }

      if (data.success) {
        router.push('/calendar')
        router.refresh()
      } else {
        setError(data.error ?? 'Mot de passe incorrect')
        setPassword('')
      }
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Logo + title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-4 shadow-lg shadow-accent/30">
            <Puzzle className="w-8 h-8 text-white" strokeWidth={1.75} />
          </div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
            Mon Espace
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Accès sécurisé à votre espace
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-xl p-6 shadow-2xl shadow-black/40">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password field */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-secondary"
              >
                Mot de passe
              </label>

              <div className="relative">
                {/* Left icon */}
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Lock className="w-4 h-4 text-text-muted" />
                </div>

                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    'w-full bg-background border rounded-lg',
                    'pl-9 pr-10 py-2.5 text-sm',
                    'text-text-primary placeholder:text-text-muted',
                    'transition-colors duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/60',
                    error
                      ? 'border-red-500/50 focus:border-red-500/60 focus:ring-red-500/30'
                      : 'border-border hover:border-border-strong'
                  )}
                  placeholder="Entrez votre mot de passe"
                  autoComplete="current-password"
                  autoFocus
                  disabled={loading}
                />

                {/* Show/hide toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={loading}
                  className={cn(
                    'absolute right-3 top-1/2 -translate-y-1/2',
                    'text-text-muted hover:text-text-secondary',
                    'transition-colors duration-200',
                    'focus:outline-none'
                  )}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 animate-fade-in">
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-400" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !password}
              className={cn(
                'w-full flex items-center justify-center gap-2',
                'py-2.5 rounded-lg text-sm font-medium',
                'bg-accent hover:bg-accent-hover text-white',
                'transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-surface',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'shadow-lg shadow-accent/20 hover:shadow-accent/30'
              )}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-text-muted mt-6">
          Espace personnel privé — accès restreint
        </p>
      </div>
    </div>
  )
}
