'use client'

import { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import * as Switch from '@radix-ui/react-switch'
import * as Slider from '@radix-ui/react-slider'
import * as Select from '@radix-ui/react-select'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import * as Label from '@radix-ui/react-label'
import {
  Sun,
  Moon,
  Volume2,
  Timer,
  Shield,
  Database,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  XCircle,
  Edit3,
  ChevronDown,
  RefreshCw,
  Archive,
  FileJson,
  FileText,
  Clock,
  Package,
} from 'lucide-react'
import { cn, bytesToHuman } from '@/lib/utils'
import type { AppSettings, Widget } from '@/types'

// ── Default settings (used while loading) ─────────────────────
const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  editorFont: 'mono',
  fontSize: 14,
  maxEditorWidth: 800,
  showMilliseconds: true,
  alertSound: 'beep',
  showTimerInSidebar: true,
  sessionTimeout: 60,
}

// ── DB field mapping ──────────────────────────────────────────
type DbSettingsUpdate = Partial<{
  theme: string
  editor_font: string
  font_size: number
  max_editor_width: number
  show_milliseconds: boolean
  alert_sound: string
  show_timer_sidebar: boolean
  session_timeout: number
}>

// ── Storage stats ─────────────────────────────────────────────
interface StorageStats {
  noteCount: number
  journalCount: number
  versionCount: number
  estimatedBytes: number
  widgetCount: number
}

// ── Reusable: labelled toggle row ─────────────────────────────
function SettingRow({
  label,
  description,
  htmlFor,
  children,
}: {
  label: string
  description?: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
      <div className="flex-1 mr-4">
        <Label.Root
          htmlFor={htmlFor}
          className="text-sm font-medium text-text-primary cursor-pointer select-none"
        >
          {label}
        </Label.Root>
        {description && (
          <p className="text-xs text-text-muted mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

// ── Reusable: section card ─────────────────────────────────────
function SettingsGroup({
  title,
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-surface rounded-lg px-4 mb-4">
      {title && (
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest pt-4 pb-1">
          {title}
        </p>
      )}
      {children}
    </div>
  )
}

// ── Reusable: toggle switch ────────────────────────────────────
function ToggleSwitch({
  checked,
  onCheckedChange,
  id,
  disabled = false,
}: {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  id?: string
  disabled?: boolean
}) {
  return (
    <Switch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        checked ? 'bg-accent' : 'bg-surface-hover',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <Switch.Thumb
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </Switch.Root>
  )
}

// ── Reusable: styled Select ────────────────────────────────────
function StyledSelect({
  id,
  value,
  onValueChange,
  options,
  icon: Icon,
}: {
  id?: string
  value: string
  onValueChange: (v: string) => void
  options: { value: string; label: string }[]
  icon?: React.ElementType
}) {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger
        id={id}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 min-w-[140px]',
          'bg-surface-hover border border-border rounded text-sm text-text-primary',
          'hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-accent',
          'transition-colors'
        )}
      >
        {Icon && <Icon className="h-4 w-4 text-text-muted flex-shrink-0" />}
        <Select.Value className="flex-1 text-left" />
        <ChevronDown className="h-4 w-4 text-text-muted ml-auto flex-shrink-0" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="bg-surface border border-border rounded-lg shadow-2xl z-50 overflow-hidden"
          position="popper"
          sideOffset={4}
        >
          <Select.Viewport>
            {options.map(opt => (
              <Select.Item
                key={opt.value}
                value={opt.value}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm text-text-secondary cursor-pointer',
                  'focus:bg-surface-hover focus:outline-none',
                  'data-[highlighted]:bg-surface-hover data-[highlighted]:text-text-primary'
                )}
              >
                <Select.ItemIndicator>
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                </Select.ItemIndicator>
                <Select.ItemText>{opt.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

// ── Position badge helpers ─────────────────────────────────────
const POSITION_LABELS: Record<Widget['position'], string> = {
  sidebar: 'Sidebar',
  float: 'Flottant',
  page: 'Page',
}

const POSITION_STYLES: Record<Widget['position'], string> = {
  sidebar: 'bg-blue-500/20 text-blue-400',
  float: 'bg-orange-500/20 text-orange-400',
  page: 'bg-green-500/20 text-green-400',
}

// ══════════════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════════════
export default function SettingsSection() {
  // ── Settings state ─────────────────────────────────────────
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // ── Toast feedback ─────────────────────────────────────────
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // ── Widgets state ──────────────────────────────────────────
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [widgetsLoading, setWidgetsLoading] = useState(false)

  // ── Security tab ───────────────────────────────────────────
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [passwordLoading, setPasswordLoading] = useState(false)

  // ── Data tab ───────────────────────────────────────────────
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'ok' | 'error'>('checking')
  const [purging, setPurging] = useState(false)
  const [exportLoading, setExportLoading] = useState<string | null>(null)

  const importFileRef = useRef<HTMLInputElement>(null)
  const widgetFileRef = useRef<HTMLInputElement>(null)

  // ── Show toast ─────────────────────────────────────────────
  const showFeedback = useCallback(
    (type: 'success' | 'error', message: string) => {
      setFeedback({ type, message })
      setTimeout(() => setFeedback(null), 3500)
    },
    []
  )

  // ── Load settings ──────────────────────────────────────────
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (!d.error) setSettings(d as AppSettings)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // ── Load widgets ───────────────────────────────────────────
  useEffect(() => {
    setWidgetsLoading(true)
    fetch('/api/widgets')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setWidgets(d)
        else if (Array.isArray(d?.data)) setWidgets(d.data)
      })
      .catch(() => {/* widget API may not exist yet */})
      .finally(() => setWidgetsLoading(false))
  }, [])

  // ── Load storage stats + check Supabase ───────────────────
  useEffect(() => {
    setStatsLoading(true)
    fetch('/api/storage-stats')
      .then(r => r.json())
      .then(d => {
        if (!d.error) {
          setStorageStats(d as StorageStats)
          setSupabaseStatus('ok')
        } else {
          setSupabaseStatus('error')
        }
      })
      .catch(() => setSupabaseStatus('error'))
      .finally(() => setStatsLoading(false))
  }, [])

  // ── Persist a settings change ──────────────────────────────
  const saveSetting = useCallback(
    async (updates: DbSettingsUpdate) => {
      setSaving(true)
      try {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
        if (!res.ok) throw new Error('Échec de la sauvegarde')
        const d = await res.json()
        if (!d.error) setSettings(d as AppSettings)
      } catch {
        showFeedback('error', 'Erreur lors de la sauvegarde')
      } finally {
        setSaving(false)
      }
    },
    [showFeedback]
  )

  // ── Password change ────────────────────────────────────────
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Le nouveau mot de passe doit faire au moins 6 caractères')
      return
    }

    setPasswordLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword,
        }),
      })
      const d = await res.json()
      if (!res.ok) {
        setPasswordError(d.error || 'Erreur lors du changement de mot de passe')
      } else {
        setPasswordSuccess(
          `${d.message}\n\nNouveau hash :\n${d.newHash}`
        )
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
      }
    } catch {
      setPasswordError('Erreur réseau')
    } finally {
      setPasswordLoading(false)
    }
  }

  // ── File export ────────────────────────────────────────────
  const handleExport = async (type: 'notes-json' | 'notes-zip' | 'journal-json') => {
    setExportLoading(type)
    try {
      const res = await fetch(`/api/export?type=${type}`)
      if (!res.ok) throw new Error('Erreur export')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = type === 'notes-zip' ? 'zip' : 'json'
      const base = type === 'journal-json' ? 'journal' : 'notes'
      a.download = `blocnote-${base}-${new Date().toISOString().slice(0, 10)}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      showFeedback('error', "Erreur lors de l'export")
    } finally {
      setExportLoading(null)
    }
  }

  // ── Import .md files ───────────────────────────────────────
  const handleImportMd = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const formData = new FormData()
    Array.from(files).forEach(f => formData.append('files', f))
    try {
      const res = await fetch('/api/import', { method: 'POST', body: formData })
      const d = await res.json()
      if (res.ok) showFeedback('success', `${d.imported ?? files.length} fichier(s) importé(s)`)
      else showFeedback('error', d.error || "Erreur d'import")
    } catch {
      showFeedback('error', "Erreur lors de l'import")
    }
    if (importFileRef.current) importFileRef.current.value = ''
  }

  // ── Import .widget.js ──────────────────────────────────────
  const handleImportWidget = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const code = await file.text()
    const name = file.name.replace(/\.widget\.js$/, '').replace(/_/g, ' ')
    try {
      const res = await fetch('/api/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code, size: 'small', position: 'sidebar' }),
      })
      const d = await res.json()
      if (res.ok) {
        setWidgets(prev => [...prev, (d.data ?? d) as Widget])
        showFeedback('success', `Widget "${name}" importé`)
      } else {
        showFeedback('error', d.error || "Erreur d'import")
      }
    } catch {
      showFeedback('error', "Erreur lors de l'import du widget")
    }
    if (widgetFileRef.current) widgetFileRef.current.value = ''
  }

  // ── Export all widgets ─────────────────────────────────────
  const handleExportWidgets = () => {
    const json = JSON.stringify(widgets, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `blocnote-widgets-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ── Toggle single widget ───────────────────────────────────
  const toggleWidget = async (id: string, is_active: boolean) => {
    setWidgets(prev => prev.map(w => (w.id === id ? { ...w, is_active } : w)))
    try {
      await fetch(`/api/widgets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active }),
      })
    } catch {
      // Revert on failure
      setWidgets(prev => prev.map(w => (w.id === id ? { ...w, is_active: !is_active } : w)))
      showFeedback('error', 'Erreur de mise à jour')
    }
  }

  // ── Delete widget ──────────────────────────────────────────
  const deleteWidget = async (id: string) => {
    try {
      const res = await fetch(`/api/widgets/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setWidgets(prev => prev.filter(w => w.id !== id))
        showFeedback('success', 'Widget supprimé')
      } else {
        showFeedback('error', 'Erreur de suppression')
      }
    } catch {
      showFeedback('error', 'Erreur réseau')
    }
  }

  // ── Bulk toggle ────────────────────────────────────────────
  const bulkToggle = async (is_active: boolean) => {
    const original = widgets
    setWidgets(prev => prev.map(w => ({ ...w, is_active })))
    try {
      await Promise.all(
        original.map(w =>
          fetch(`/api/widgets/${w.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active }),
          })
        )
      )
    } catch {
      setWidgets(original)
      showFeedback('error', 'Erreur lors de la mise à jour groupée')
    }
  }

  // ── Purge old versions ─────────────────────────────────────
  const handlePurge = async () => {
    setPurging(true)
    try {
      const res = await fetch('/api/purge-versions', { method: 'POST' })
      const d = await res.json()
      if (res.ok) {
        showFeedback('success', `${d.deleted} version(s) supprimée(s)`)
        // Refresh stats
        const statsRes = await fetch('/api/storage-stats')
        const statsData = await statsRes.json()
        if (!statsData.error) setStorageStats(statsData)
      } else {
        showFeedback('error', d.error || 'Erreur')
      }
    } catch {
      showFeedback('error', 'Erreur réseau')
    } finally {
      setPurging(false)
    }
  }

  // ── Loading skeleton ───────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 text-text-muted animate-spin" />
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════════
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* Page header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Paramètres</h1>
          <p className="text-sm text-text-muted mt-1">
            Personnalisez votre espace de travail
          </p>
        </div>
        {saving && (
          <div className="flex items-center gap-1.5 text-xs text-text-muted mt-1">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Sauvegarde…
          </div>
        )}
      </div>

      {/* Toast feedback */}
      {feedback && (
        <div
          className={cn(
            'fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-sm animate-fade-in',
            feedback.type === 'success'
              ? 'bg-green-950 text-green-300 border border-green-700/50'
              : 'bg-red-950 text-red-300 border border-red-700/50'
          )}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 flex-shrink-0" />
          )}
          {feedback.message}
        </div>
      )}

      <Tabs.Root defaultValue="apparence">
        {/* ── Tab bar ──────────────────────────────────────── */}
        <Tabs.List className="flex gap-1 p-1 bg-surface rounded-lg mb-6 overflow-x-auto">
          {([
            { value: 'apparence', label: 'Apparence', Icon: Sun },
            { value: 'widgets',   label: 'Widgets',   Icon: Package },
            { value: 'timer',     label: 'Timer',     Icon: Timer },
            { value: 'securite',  label: 'Sécurité',  Icon: Shield },
            { value: 'donnees',   label: 'Données',   Icon: Database },
          ] as const).map(({ value, label, Icon }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium flex-shrink-0 transition-all',
                'text-text-secondary hover:text-text-primary',
                'data-[state=active]:bg-accent data-[state=active]:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* ════════════════════════════════════════════════════
            Tab 1 — Apparence
        ════════════════════════════════════════════════════ */}
        <Tabs.Content value="apparence" className="animate-fade-in">

          <SettingsGroup title="Thème">
            <SettingRow
              label="Mode sombre"
              description="Basculer entre le thème sombre et clair"
              htmlFor="theme-toggle"
            >
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-text-muted" />
                <ToggleSwitch
                  id="theme-toggle"
                  checked={settings.theme === 'dark'}
                  onCheckedChange={v => {
                    const theme = v ? 'dark' : 'light'
                    setSettings(s => ({ ...s, theme }))
                    saveSetting({ theme })
                  }}
                />
                <Moon className="h-4 w-4 text-text-muted" />
              </div>
            </SettingRow>
          </SettingsGroup>

          <SettingsGroup title="Police de l'éditeur">
            <div className="grid grid-cols-2 gap-3 py-3">
              {([
                { value: 'mono', label: 'Monospace', sample: 'const x = 42;', fontClass: 'font-mono' },
                { value: 'sans', label: 'Sans-serif', sample: 'Texte fluide et clair', fontClass: 'font-sans' },
              ] as const).map(font => (
                <button
                  key={font.value}
                  onClick={() => {
                    setSettings(s => ({ ...s, editorFont: font.value }))
                    saveSetting({ editor_font: font.value })
                  }}
                  className={cn(
                    'p-4 rounded-lg border-2 text-left transition-all',
                    settings.editorFont === font.value
                      ? 'border-accent bg-accent-subtle'
                      : 'border-border hover:border-border-strong'
                  )}
                >
                  <span className={cn('block text-base text-text-primary mb-1', font.fontClass)}>
                    {font.sample}
                  </span>
                  <span className="text-xs text-text-muted">{font.label}</span>
                  {settings.editorFont === font.value && (
                    <CheckCircle2 className="h-4 w-4 text-accent mt-1.5" />
                  )}
                </button>
              ))}
            </div>
          </SettingsGroup>

          <SettingsGroup title="Taille de police">
            <div className="py-3 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  Taille actuelle : <strong className="text-text-primary">{settings.fontSize}px</strong>
                </span>
                <span className="text-xs text-text-muted">12px — 20px</span>
              </div>
              <Slider.Root
                value={[settings.fontSize]}
                min={12}
                max={20}
                step={1}
                onValueChange={([v]) => setSettings(s => ({ ...s, fontSize: v }))}
                onValueCommit={([v]) => saveSetting({ font_size: v })}
                className="relative flex items-center w-full h-5 touch-none select-none"
              >
                <Slider.Track className="bg-surface-hover relative grow rounded-full h-1.5">
                  <Slider.Range className="absolute bg-accent rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb
                  className="block h-5 w-5 rounded-full border-2 border-accent bg-white shadow-md cursor-grab focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
                  aria-label="Taille de police"
                />
              </Slider.Root>
              {/* Live preview */}
              <div
                className="p-3 rounded-lg border border-border bg-background text-text-primary transition-all duration-150"
                style={{
                  fontSize: `${settings.fontSize}px`,
                  fontFamily:
                    settings.editorFont === 'mono'
                      ? '"JetBrains Mono", "Fira Code", Menlo, monospace'
                      : 'Inter, Geist, system-ui, sans-serif',
                  lineHeight: 1.6,
                }}
              >
                Aperçu : Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              </div>
            </div>
          </SettingsGroup>

          <SettingsGroup title="Largeur de l'éditeur">
            <SettingRow
              label="Largeur maximale"
              description="Largeur de la colonne de texte (600 – 1400 px)"
              htmlFor="max-width"
            >
              <div className="flex items-center gap-2">
                <input
                  id="max-width"
                  type="number"
                  min={600}
                  max={1400}
                  step={50}
                  value={settings.maxEditorWidth}
                  onChange={e =>
                    setSettings(s => ({ ...s, maxEditorWidth: Number(e.target.value) }))
                  }
                  onBlur={e => saveSetting({ max_editor_width: Number(e.target.value) })}
                  className="w-24 px-3 py-1.5 bg-surface-hover border border-border rounded text-sm text-text-primary text-right focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                />
                <span className="text-sm text-text-muted">px</span>
              </div>
            </SettingRow>
          </SettingsGroup>

        </Tabs.Content>

        {/* ════════════════════════════════════════════════════
            Tab 2 — Widgets
        ════════════════════════════════════════════════════ */}
        <Tabs.Content value="widgets" className="animate-fade-in space-y-4">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => bulkToggle(true)}
              className="px-3 py-1.5 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded transition-colors"
            >
              Tout activer
            </button>
            <button
              onClick={() => bulkToggle(false)}
              className="px-3 py-1.5 text-sm bg-surface hover:bg-surface-hover text-text-secondary border border-border rounded transition-colors"
            >
              Tout désactiver
            </button>

            <div className="flex-1" />

            <button
              onClick={handleExportWidgets}
              disabled={widgets.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-surface hover:bg-surface-hover text-text-secondary border border-border rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-3.5 w-3.5" />
              Exporter tous
            </button>

            <label className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-surface hover:bg-surface-hover text-text-secondary border border-border rounded transition-colors cursor-pointer">
              <Upload className="h-3.5 w-3.5" />
              Importer un widget
              <input
                ref={widgetFileRef}
                type="file"
                accept=".widget.js,.js"
                className="hidden"
                onChange={handleImportWidget}
              />
            </label>
          </div>

          {/* Widget list */}
          <div className="bg-surface rounded-lg overflow-hidden">
            {widgetsLoading ? (
              <div className="flex items-center justify-center py-10">
                <RefreshCw className="h-5 w-5 text-text-muted animate-spin" />
              </div>
            ) : widgets.length === 0 ? (
              <div className="text-center py-10 text-text-muted">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Aucun widget configuré</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {widgets.map(widget => (
                  <li
                    key={widget.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors"
                  >
                    {/* Name + badge */}
                    <div className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-text-primary truncate">
                        {widget.name}
                      </span>
                      <span
                        className={cn(
                          'inline-block text-xs px-2 py-0.5 rounded-full mt-1',
                          POSITION_STYLES[widget.position]
                        )}
                      >
                        {POSITION_LABELS[widget.position]}
                      </span>
                    </div>

                    {/* Active toggle */}
                    <ToggleSwitch
                      checked={widget.is_active}
                      onCheckedChange={v => toggleWidget(widget.id, v)}
                    />

                    {/* Edit link */}
                    <a
                      href={`/widgets/${widget.id}/edit`}
                      className="p-1.5 text-text-muted hover:text-text-primary hover:bg-background rounded transition-colors"
                      title="Éditer"
                    >
                      <Edit3 className="h-4 w-4" />
                    </a>

                    {/* Delete with confirmation */}
                    <AlertDialog.Root>
                      <AlertDialog.Trigger asChild>
                        <button
                          className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </AlertDialog.Trigger>
                      <AlertDialog.Portal>
                        <AlertDialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
                        <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-surface border border-border rounded-xl shadow-2xl p-6 w-full max-w-sm">
                          <AlertDialog.Title className="text-base font-semibold text-text-primary mb-2">
                            Supprimer le widget ?
                          </AlertDialog.Title>
                          <AlertDialog.Description className="text-sm text-text-secondary mb-6">
                            <strong className="text-text-primary">{widget.name}</strong> sera
                            supprimé définitivement. Cette action est irréversible.
                          </AlertDialog.Description>
                          <div className="flex justify-end gap-3">
                            <AlertDialog.Cancel asChild>
                              <button className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary bg-surface-hover rounded transition-colors">
                                Annuler
                              </button>
                            </AlertDialog.Cancel>
                            <AlertDialog.Action asChild>
                              <button
                                onClick={() => deleteWidget(widget.id)}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                              >
                                Supprimer
                              </button>
                            </AlertDialog.Action>
                          </div>
                        </AlertDialog.Content>
                      </AlertDialog.Portal>
                    </AlertDialog.Root>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </Tabs.Content>

        {/* ════════════════════════════════════════════════════
            Tab 3 — Timer
        ════════════════════════════════════════════════════ */}
        <Tabs.Content value="timer" className="animate-fade-in">

          <SettingsGroup title="Affichage">
            <SettingRow
              label="Afficher les millisecondes"
              description="Affiche les millièmes de seconde dans le chronomètre"
              htmlFor="show-ms"
            >
              <ToggleSwitch
                id="show-ms"
                checked={settings.showMilliseconds}
                onCheckedChange={v => {
                  setSettings(s => ({ ...s, showMilliseconds: v }))
                  saveSetting({ show_milliseconds: v })
                }}
              />
            </SettingRow>
            <SettingRow
              label="Afficher le timer dans la sidebar"
              description="Mini-affichage du timer dans la barre latérale"
              htmlFor="timer-sidebar"
            >
              <ToggleSwitch
                id="timer-sidebar"
                checked={settings.showTimerInSidebar}
                onCheckedChange={v => {
                  setSettings(s => ({ ...s, showTimerInSidebar: v }))
                  saveSetting({ show_timer_sidebar: v })
                }}
              />
            </SettingRow>
          </SettingsGroup>

          <SettingsGroup title="Son d'alerte">
            <SettingRow
              label="Son de fin de compte à rebours"
              description="Son joué lorsque le timer atteint zéro"
              htmlFor="alert-sound"
            >
              <StyledSelect
                id="alert-sound"
                value={settings.alertSound}
                onValueChange={v => {
                  setSettings(s => ({ ...s, alertSound: v }))
                  saveSetting({ alert_sound: v })
                }}
                icon={Volume2}
                options={[
                  { value: 'beep', label: 'Beep' },
                  { value: 'ding', label: 'Ding' },
                  { value: 'silence', label: 'Silence' },
                ]}
              />
            </SettingRow>
          </SettingsGroup>

        </Tabs.Content>

        {/* ════════════════════════════════════════════════════
            Tab 4 — Sécurité
        ════════════════════════════════════════════════════ */}
        <Tabs.Content value="securite" className="animate-fade-in space-y-4">

          <SettingsGroup title="Changer le mot de passe">
            <form onSubmit={handlePasswordChange} className="space-y-3 py-3">
              {([
                { id: 'old-pass', label: 'Mot de passe actuel', key: 'oldPassword' },
                { id: 'new-pass', label: 'Nouveau mot de passe', key: 'newPassword' },
                { id: 'conf-pass', label: 'Confirmer le nouveau mot de passe', key: 'confirmPassword' },
              ] as const).map(field => (
                <div key={field.id}>
                  <label htmlFor={field.id} className="block text-xs text-text-muted mb-1">
                    {field.label}
                  </label>
                  <input
                    id={field.id}
                    type="password"
                    autoComplete="off"
                    value={passwordForm[field.key]}
                    onChange={e =>
                      setPasswordForm(f => ({ ...f, [field.key]: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
                    required
                  />
                </div>
              ))}

              {passwordError && (
                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-900/20 border border-red-700/30 rounded p-2.5">
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="text-sm text-green-400 bg-green-900/20 border border-green-700/30 rounded p-2.5 whitespace-pre-line break-all">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{passwordSuccess}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover disabled:opacity-60 rounded transition-colors"
              >
                {passwordLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Vérification…
                  </span>
                ) : (
                  'Changer le mot de passe'
                )}
              </button>
            </form>
          </SettingsGroup>

          <SettingsGroup title="Session">
            <SettingRow
              label="Délai d'expiration de session"
              description="Durée d'inactivité avant déconnexion automatique"
              htmlFor="session-timeout"
            >
              <StyledSelect
                id="session-timeout"
                value={String(settings.sessionTimeout)}
                onValueChange={v => {
                  const sessionTimeout = Number(v)
                  setSettings(s => ({ ...s, sessionTimeout }))
                  saveSetting({ session_timeout: sessionTimeout })
                }}
                icon={Clock}
                options={[
                  { value: '15', label: '15 minutes' },
                  { value: '30', label: '30 minutes' },
                  { value: '60', label: '1 heure' },
                  { value: '0', label: 'Jamais' },
                ]}
              />
            </SettingRow>
          </SettingsGroup>

        </Tabs.Content>

        {/* ════════════════════════════════════════════════════
            Tab 5 — Données
        ════════════════════════════════════════════════════ */}
        <Tabs.Content value="donnees" className="animate-fade-in space-y-4">

          {/* Supabase status */}
          <SettingsGroup title="Connexion Supabase">
            <div className="flex items-center gap-3 py-3">
              <div
                className={cn(
                  'h-3 w-3 rounded-full flex-shrink-0 transition-colors',
                  supabaseStatus === 'checking' && 'bg-yellow-400 animate-pulse',
                  supabaseStatus === 'ok' && 'bg-green-400',
                  supabaseStatus === 'error' && 'bg-red-400'
                )}
              />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {supabaseStatus === 'checking' && 'Vérification en cours…'}
                  {supabaseStatus === 'ok' && 'Connecté à Supabase'}
                  {supabaseStatus === 'error' && 'Impossible de joindre Supabase'}
                </p>
                <p className="text-xs text-text-muted mt-0.5 break-all">
                  {process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'URL non configurée'}
                </p>
              </div>
            </div>
          </SettingsGroup>

          {/* Storage stats */}
          <SettingsGroup title="Statistiques de stockage">
            {statsLoading ? (
              <div className="flex items-center justify-center py-6">
                <RefreshCw className="h-5 w-5 text-text-muted animate-spin" />
              </div>
            ) : storageStats ? (
              <div className="grid grid-cols-2 gap-3 py-3">
                {([
                  { label: 'Notes', value: storageStats.noteCount },
                  { label: 'Entrées journal', value: storageStats.journalCount },
                  { label: 'Versions sauvegardées', value: storageStats.versionCount },
                  { label: 'Widgets', value: storageStats.widgetCount },
                  {
                    label: 'Taille estimée',
                    value: bytesToHuman(storageStats.estimatedBytes),
                    wide: true,
                  },
                ] as { label: string; value: string | number; wide?: boolean }[]).map(stat => (
                  <div
                    key={stat.label}
                    className={cn(
                      'bg-background rounded-lg p-3',
                      stat.wide ? 'col-span-2' : ''
                    )}
                  >
                    <p className="text-xs text-text-muted">{stat.label}</p>
                    <p className="text-xl font-semibold text-text-primary mt-0.5">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted py-3">
                Impossible de charger les statistiques
              </p>
            )}
          </SettingsGroup>

          {/* Export */}
          <SettingsGroup title="Exporter">
            <div className="space-y-2 py-2">
              {([
                {
                  type: 'notes-json' as const,
                  label: 'Exporter les notes (JSON)',
                  description: 'Toutes les notes au format JSON',
                  Icon: FileJson,
                },
                {
                  type: 'notes-zip' as const,
                  label: 'Exporter les notes (ZIP)',
                  description: 'Un fichier .md par note dans une archive ZIP',
                  Icon: Archive,
                },
                {
                  type: 'journal-json' as const,
                  label: 'Exporter le journal (JSON)',
                  description: 'Toutes les entrées du journal de bord',
                  Icon: FileText,
                },
              ]).map(item => (
                <button
                  key={item.type}
                  onClick={() => handleExport(item.type)}
                  disabled={exportLoading === item.type}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-background hover:bg-surface-hover border border-border rounded-lg text-left transition-colors disabled:opacity-60"
                >
                  {exportLoading === item.type ? (
                    <RefreshCw className="h-5 w-5 text-accent animate-spin flex-shrink-0" />
                  ) : (
                    <item.Icon className="h-5 w-5 text-accent flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{item.label}</p>
                    <p className="text-xs text-text-muted">{item.description}</p>
                  </div>
                  <Download className="h-4 w-4 text-text-muted flex-shrink-0" />
                </button>
              ))}
            </div>
          </SettingsGroup>

          {/* Import */}
          <SettingsGroup title="Importer">
            <label className="w-full flex items-center gap-3 px-4 py-3 bg-background hover:bg-surface-hover border border-dashed border-border rounded-lg cursor-pointer transition-colors">
              <Upload className="h-5 w-5 text-accent flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Importer des fichiers .md
                </p>
                <p className="text-xs text-text-muted">
                  Sélectionnez un ou plusieurs fichiers Markdown
                </p>
              </div>
              <input
                ref={importFileRef}
                type="file"
                accept=".md"
                multiple
                className="hidden"
                onChange={handleImportMd}
              />
            </label>
          </SettingsGroup>

          {/* Maintenance */}
          <SettingsGroup title="Maintenance">
            <AlertDialog.Root>
              <AlertDialog.Trigger asChild>
                <button className="w-full flex items-center gap-3 px-4 py-3 bg-background hover:bg-red-900/10 border border-border hover:border-red-700/40 rounded-lg text-left transition-colors">
                  <Trash2 className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      Purger les anciennes versions
                    </p>
                    <p className="text-xs text-text-muted">
                      Supprime toutes les versions de notes de plus de 30 jours
                    </p>
                  </div>
                </button>
              </AlertDialog.Trigger>
              <AlertDialog.Portal>
                <AlertDialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
                <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-surface border border-border rounded-xl shadow-2xl p-6 w-full max-w-sm">
                  <AlertDialog.Title className="text-base font-semibold text-text-primary mb-2">
                    Purger les anciennes versions ?
                  </AlertDialog.Title>
                  <AlertDialog.Description className="text-sm text-text-secondary mb-6">
                    Toutes les versions de notes enregistrées il y a plus de 30 jours seront
                    supprimées <strong className="text-text-primary">définitivement</strong>.
                    Cette action est irréversible.
                  </AlertDialog.Description>
                  <div className="flex justify-end gap-3">
                    <AlertDialog.Cancel asChild>
                      <button className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary bg-surface-hover rounded transition-colors">
                        Annuler
                      </button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action asChild>
                      <button
                        onClick={handlePurge}
                        disabled={purging}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded transition-colors"
                      >
                        {purging ? (
                          <span className="flex items-center gap-2">
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            Suppression…
                          </span>
                        ) : (
                          'Purger'
                        )}
                      </button>
                    </AlertDialog.Action>
                  </div>
                </AlertDialog.Content>
              </AlertDialog.Portal>
            </AlertDialog.Root>
          </SettingsGroup>

        </Tabs.Content>

      </Tabs.Root>
    </div>
  )
}
