'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  X,
  Folder,
  Star,
  Rocket,
  BookOpen,
  Code2,
  Terminal,
  Heart,
  Music,
  Camera,
  Coffee,
  Globe,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Project } from '@/types'
import type { LucideIcon } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────

export const PRESET_COLORS = [
  '#7c3aed', // violet
  '#3b82f6', // blue
  '#22c55e', // green
  '#ef4444', // red
  '#f97316', // orange
  '#ec4899', // pink
  '#eab308', // yellow
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#f43f5e', // rose
  '#06b6d4', // cyan
  '#84cc16', // lime
]

export const PROJECT_ICONS: { name: string; Icon: LucideIcon }[] = [
  { name: 'folder', Icon: Folder },
  { name: 'star', Icon: Star },
  { name: 'rocket', Icon: Rocket },
  { name: 'book', Icon: BookOpen },
  { name: 'code', Icon: Code2 },
  { name: 'terminal', Icon: Terminal },
  { name: 'heart', Icon: Heart },
  { name: 'music', Icon: Music },
  { name: 'camera', Icon: Camera },
  { name: 'coffee', Icon: Coffee },
  { name: 'globe', Icon: Globe },
  { name: 'zap', Icon: Zap },
]

export const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  PROJECT_ICONS.map(({ name, Icon }) => [name, Icon])
)

// ── Component ─────────────────────────────────────────────────

interface ProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project | null
  onSave: (data: { name: string; color: string; icon: string }) => Promise<void>
}

export default function ProjectModal({
  open,
  onOpenChange,
  project,
  onSave,
}: ProjectModalProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#7c3aed')
  const [icon, setIcon] = useState('folder')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setName(project?.name ?? '')
      setColor(project?.color ?? '#7c3aed')
      setIcon(project?.icon ?? 'folder')
    }
  }, [open, project])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await onSave({ name: name.trim(), color, icon })
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  const SelectedIcon = ICON_MAP[icon] ?? Folder

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                     w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl
                     animate-fade-in p-6 focus:outline-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-semibold text-text-primary">
              {project ? 'Modifier le projet' : 'Nouveau projet'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-text-muted hover:text-text-primary transition-colors rounded-md p-1 hover:bg-surface-hover">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Live preview */}
            <div className="flex items-center gap-3 px-4 py-3 bg-background rounded-lg border border-border">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  backgroundColor: color + '22',
                  border: `1px solid ${color}44`,
                }}
              >
                <SelectedIcon size={20} style={{ color }} />
              </div>
              <span className="text-text-primary font-medium truncate">
                {name || <span className="text-text-muted italic">Nom du projet</span>}
              </span>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Nom du projet
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mon super projet..."
                autoFocus
                className="w-full px-3 py-2 bg-background border border-border rounded-lg
                           text-text-primary placeholder-text-muted
                           focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Color picker */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Couleur
              </label>
              <div className="flex flex-wrap gap-2.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    title={c}
                    className={cn(
                      'w-7 h-7 rounded-full transition-all hover:scale-110',
                      color === c &&
                        'ring-2 ring-white ring-offset-2 ring-offset-surface scale-110'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Icon selector */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Icône
              </label>
              <div className="grid grid-cols-6 gap-2">
                {PROJECT_ICONS.map(({ name: iconName, Icon }) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
                      icon === iconName
                        ? 'bg-accent/20 border border-accent/50'
                        : 'bg-background border border-border hover:bg-surface-hover hover:border-border-strong'
                    )}
                    title={iconName}
                  >
                    <Icon
                      size={17}
                      className={
                        icon === iconName ? 'text-accent-light' : 'text-text-secondary'
                      }
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="flex-1 px-4 py-2 bg-surface-hover border border-border rounded-lg
                             text-text-secondary hover:text-text-primary transition-colors text-sm"
                >
                  Annuler
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="flex-1 px-4 py-2 bg-accent hover:bg-accent-hover
                           disabled:opacity-50 disabled:cursor-not-allowed
                           rounded-lg text-white font-medium transition-colors text-sm"
              >
                {loading ? 'Enregistrement…' : project ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
