'use client'

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Clock, RotateCcw, X, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NoteVersion } from '@/types'

interface VersionHistoryModalProps {
  noteId: string
  isOpen: boolean
  onClose: () => void
  onRestore: (content: string) => void
}

function formatSavedAt(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "d MMM yyyy 'à' HH:mm", { locale: fr })
  } catch {
    return dateStr
  }
}

function previewContent(content: string, length = 120): string {
  return content.replace(/^#+\s/gm, '').replace(/[*_`~]/g, '').trim().slice(0, length)
}

export default function VersionHistoryModal({
  noteId,
  isOpen,
  onClose,
  onRestore,
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<NoteVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [restoring, setRestoring] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    fetch(`/api/notes/${noteId}/versions`)
      .then((r) => r.json())
      .then((data) => {
        setVersions(Array.isArray(data) ? data : [])
        setSelectedId(data?.[0]?.id ?? null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isOpen, noteId])

  const selected = versions.find((v) => v.id === selectedId)

  const handleRestore = async (version: NoteVersion) => {
    setRestoring(version.id)
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: version.content }),
      })
      if (res.ok) {
        onRestore(version.content)
        onClose()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setRestoring(null)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'w-[90vw] max-w-3xl max-h-[80vh] flex flex-col',
            'bg-surface border border-border rounded-xl shadow-2xl animate-fade-in overflow-hidden'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-accent-light" />
              <Dialog.Title className="text-base font-semibold text-text-primary">
                Historique des versions
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            {/* Version list */}
            <div className="w-64 border-r border-border overflow-y-auto shrink-0">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : versions.length === 0 ? (
                <div className="p-4 text-center text-text-muted text-sm">
                  Aucune version sauvegardée.
                </div>
              ) : (
                <ul className="py-1">
                  {versions.map((v, i) => (
                    <li key={v.id}>
                      <button
                        onClick={() => setSelectedId(v.id)}
                        className={cn(
                          'w-full text-left px-4 py-3 hover:bg-surface-hover transition-colors border-b border-border/50 last:border-0',
                          selectedId === v.id && 'bg-accent-subtle border-l-2 border-l-accent'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-text-secondary">
                            {i === 0 ? 'Dernière version' : `Version ${versions.length - i}`}
                          </span>
                          {selectedId === v.id && (
                            <ChevronRight size={12} className="text-accent" />
                          )}
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">
                          {formatSavedAt(v.saved_at)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Preview */}
            <div className="flex-1 overflow-y-auto flex flex-col">
              {selected ? (
                <>
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-background/30 shrink-0">
                    <span className="text-xs text-text-muted">
                      Sauvegardée le {formatSavedAt(selected.saved_at)}
                    </span>
                    <button
                      onClick={() => handleRestore(selected)}
                      disabled={restoring === selected.id}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        'bg-accent hover:bg-accent-hover text-white disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      <RotateCcw size={12} className={restoring === selected.id ? 'animate-spin' : ''} />
                      Restaurer
                    </button>
                  </div>
                  <pre className="flex-1 p-5 text-xs text-text-muted font-mono leading-relaxed whitespace-pre-wrap overflow-y-auto">
                    {selected.content}
                  </pre>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-text-muted text-sm">
                  Sélectionnez une version
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-border bg-background/30 shrink-0">
            <p className="text-xs text-text-muted">
              Les 10 dernières versions sont conservées (jusqu'à 90 jours).
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
