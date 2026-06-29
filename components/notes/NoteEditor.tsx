'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Star,
  StarOff,
  Trash2,
  Copy,
  Clock,
  List,
  Tag as TagIcon,
  ChevronDown,
  X,
  Plus,
  Loader2,
  Check,
  AlertCircle,
  FolderOpen,
  Maximize2,
} from 'lucide-react'
import { cn, countWords, countChars } from '@/lib/utils'
import type { Note, Tag, Project } from '@/types'
import { useAutoSave } from '@/hooks/useAutoSave'
import MarkdownEditor from '@/components/editor/MarkdownEditor'
import TableOfContents from '@/components/editor/TableOfContents'
import VersionHistoryModal from '@/components/editor/VersionHistoryModal'

// ─── Types ───────────────────────────────────────────────────────────────────

interface NoteEditorProps {
  note: Note
  onNoteUpdate?: (note: Partial<Note> & { id: string }) => void
  onDelete?: (id: string) => void
  onDuplicate?: (note: Note) => void
  onClose?: () => void
  editorFont?: 'mono' | 'sans'
  fontSize?: number
}

// ─── Save status indicator ────────────────────────────────────────────────────

function SaveStatus({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (status === 'idle') return null
  return (
    <span
      className={cn(
        'flex items-center gap-1 text-xs transition-all',
        status === 'saving' && 'text-text-muted',
        status === 'saved' && 'text-green-400',
        status === 'error' && 'text-red-400'
      )}
    >
      {status === 'saving' && <Loader2 size={11} className="animate-spin" />}
      {status === 'saved' && <Check size={11} />}
      {status === 'error' && <AlertCircle size={11} />}
      {status === 'saving' && 'Enregistrement…'}
      {status === 'saved' && 'Enregistré'}
      {status === 'error' && 'Erreur'}
    </span>
  )
}

// ─── Tag badge ────────────────────────────────────────────────────────────────

function TagBadge({
  tag,
  onRemove,
}: {
  tag: Tag
  onRemove?: () => void
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: `${tag.color}22`, color: tag.color, border: `1px solid ${tag.color}44` }}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:opacity-70 transition-opacity ml-0.5"
        >
          <X size={10} />
        </button>
      )}
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NoteEditor({
  note,
  onNoteUpdate,
  onDelete,
  onDuplicate,
  onClose,
  editorFont = 'mono',
  fontSize = 14,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [isFavorite, setIsFavorite] = useState(note.is_favorite)
  const [noteTags, setNoteTags] = useState<Tag[]>(note.tags ?? [])
  const [projectId, setProjectId] = useState<string | null>(note.project_id)
  const [editorMode, setEditorMode] = useState<'edit' | 'preview' | 'split'>('edit')
  const [focusMode, setFocusMode] = useState(false)
  const [showToc, setShowToc] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [showTagInput, setShowTagInput] = useState(false)
  const [tagSearch, setTagSearch] = useState('')
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [showProjectMenu, setShowProjectMenu] = useState(false)
  const [savingMeta, setSavingMeta] = useState(false)

  const tagInputRef = useRef<HTMLInputElement>(null)
  const projectMenuRef = useRef<HTMLDivElement>(null)

  // ── Auto-save content ────────────────────────────────────────────────────
  const saveContent = useCallback(
    async (newContent: string) => {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      })
      if (!res.ok) throw new Error('Save failed')
      onNoteUpdate?.({ id: note.id, content: newContent })
    },
    [note.id, onNoteUpdate]
  )

  const { saveStatus } = useAutoSave(content, saveContent, 1200)

  // ── Fetch tags & projects ────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/tags')
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : (d.data ?? [])
        setAllTags(list)
      })
      .catch(console.error)

    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setProjects(d))
      .catch(console.error)
  }, [])

  // ── Sync note prop changes (on note switch, parent re-keys this component)
  useEffect(() => {
    setTitle(note.title)
    setContent(note.content)
    setIsFavorite(note.is_favorite)
    setNoteTags(note.tags ?? [])
    setProjectId(note.project_id)
  }, [note.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close project menu on outside click ─────────────────────────────────
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target as Node)) {
        setShowProjectMenu(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // ── Title save (on blur) ─────────────────────────────────────────────────
  const handleTitleBlur = async () => {
    if (title === note.title) return
    setSavingMeta(true)
    try {
      await fetch(`/api/notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      onNoteUpdate?.({ id: note.id, title })
    } finally {
      setSavingMeta(false)
    }
  }

  // ── Favorite toggle ──────────────────────────────────────────────────────
  const handleFavoriteToggle = async () => {
    const next = !isFavorite
    setIsFavorite(next)
    await fetch(`/api/notes/${note.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: next }),
    })
    onNoteUpdate?.({ id: note.id, is_favorite: next })
  }

  // ── Delete (move to trash) ───────────────────────────────────────────────
  const handleDelete = async () => {
    await fetch(`/api/notes/${note.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_deleted: true }),
    })
    onDelete?.(note.id)
  }

  // ── Duplicate ────────────────────────────────────────────────────────────
  const handleDuplicate = async () => {
    const res = await fetch(`/api/notes/${note.id}/duplicate`, { method: 'POST' })
    if (res.ok) {
      const copy = await res.json()
      onDuplicate?.(copy)
    }
  }

  // ── Project change ───────────────────────────────────────────────────────
  const handleProjectChange = async (pid: string | null) => {
    setProjectId(pid)
    setShowProjectMenu(false)
    await fetch(`/api/notes/${note.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: pid }),
    })
    onNoteUpdate?.({ id: note.id, project_id: pid })
  }

  // ── Tag management ───────────────────────────────────────────────────────
  const addTag = async (tag: Tag) => {
    if (noteTags.find((t) => t.id === tag.id)) return
    const next = [...noteTags, tag]
    setNoteTags(next)
    setTagSearch('')
    setShowTagInput(false)
    await fetch(`/api/notes/${note.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: next.map((t) => t.id) }),
    })
    onNoteUpdate?.({ id: note.id, tags: next })
  }

  const removeTag = async (tagId: string) => {
    const next = noteTags.filter((t) => t.id !== tagId)
    setNoteTags(next)
    await fetch(`/api/notes/${note.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: next.map((t) => t.id) }),
    })
    onNoteUpdate?.({ id: note.id, tags: next })
  }

  const createAndAddTag = async () => {
    const name = tagSearch.trim()
    if (!name) return
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const json = await res.json()
      const tag = json.data ?? json
      if (tag?.id) {
        setAllTags((prev) => [...prev.filter((t) => t.id !== tag.id), tag])
        await addTag(tag)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // ── Version restore ──────────────────────────────────────────────────────
  const handleRestore = (restoredContent: string) => {
    setContent(restoredContent)
    onNoteUpdate?.({ id: note.id, content: restoredContent })
  }

  // ── Filtered tags for autocomplete ──────────────────────────────────────
  const filteredTags = allTags.filter(
    (t) =>
      t.name.toLowerCase().includes(tagSearch.toLowerCase()) &&
      !noteTags.find((nt) => nt.id === t.id)
  )

  const currentProject = projects.find((p) => p.id === projectId)

  const words = countWords(content)
  const chars = countChars(content)

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-background',
        focusMode && 'fixed inset-0 z-50 bg-background'
      )}
    >
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface shrink-0 gap-3">
        {/* Left: project selector + save status */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Project selector */}
          <div ref={projectMenuRef} className="relative">
            <button
              onClick={() => setShowProjectMenu((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors border',
                currentProject
                  ? 'text-text-secondary border-border hover:bg-surface-hover'
                  : 'text-text-muted border-transparent hover:bg-surface-hover'
              )}
            >
              <FolderOpen size={12} style={currentProject ? { color: currentProject.color } : {}} />
              <span className="max-w-[120px] truncate">
                {currentProject ? currentProject.name : 'Aucun projet'}
              </span>
              <ChevronDown size={10} className="text-text-muted" />
            </button>

            {showProjectMenu && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-surface border border-border rounded-lg shadow-xl z-30 py-1 animate-fade-in">
                <button
                  onClick={() => handleProjectChange(null)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-xs hover:bg-surface-hover transition-colors',
                    !projectId ? 'text-accent' : 'text-text-secondary'
                  )}
                >
                  Aucun projet
                </button>
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleProjectChange(p.id)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-xs hover:bg-surface-hover transition-colors flex items-center gap-2',
                      projectId === p.id ? 'text-accent' : 'text-text-secondary'
                    )}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: p.color }}
                    />
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <SaveStatus status={savingMeta ? 'saving' : saveStatus} />
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-0.5">
          {/* TOC toggle */}
          <button
            onClick={() => setShowToc((v) => !v)}
            title="Table des matières"
            className={cn(
              'p-1.5 rounded-lg text-sm transition-colors',
              showToc
                ? 'bg-accent-subtle text-accent-light'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
            )}
          >
            <List size={15} />
          </button>

          {/* Version history */}
          <button
            onClick={() => setShowVersions(true)}
            title="Historique des versions"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <Clock size={15} />
          </button>

          <div className="w-px h-4 bg-border mx-0.5" />

          {/* Favorite */}
          <button
            onClick={handleFavoriteToggle}
            title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              isFavorite
                ? 'text-yellow-400 hover:text-yellow-300'
                : 'text-text-muted hover:text-yellow-400 hover:bg-surface-hover'
            )}
          >
            {isFavorite ? <Star size={15} fill="currentColor" /> : <StarOff size={15} />}
          </button>

          {/* Duplicate */}
          <button
            onClick={handleDuplicate}
            title="Dupliquer la note"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <Copy size={15} />
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            title="Mettre à la corbeille"
            className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <Trash2 size={15} />
          </button>

          {/* Focus mode */}
          <button
            onClick={() => setFocusMode((v) => !v)}
            title={focusMode ? 'Quitter le mode focus (F11)' : 'Mode focus (F11)'}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <Maximize2 size={15} />
          </button>
        </div>
      </div>

      {/* ── Note header: title + tags ── */}
      <div className="px-6 pt-5 pb-3 border-b border-border/50 bg-background shrink-0">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          placeholder="Titre de la note…"
          className="w-full text-2xl font-bold text-text-primary bg-transparent outline-none placeholder:text-text-muted/50 mb-3"
        />

        {/* Tags row */}
        <div className="flex flex-wrap items-center gap-1.5">
          <TagIcon size={13} className="text-text-muted shrink-0" />
          {noteTags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} onRemove={() => removeTag(tag.id)} />
          ))}

          {/* Add tag */}
          {showTagInput ? (
            <div className="relative">
              <input
                ref={tagInputRef}
                type="text"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setShowTagInput(false); setTagSearch('') }
                  if (e.key === 'Enter') createAndAddTag()
                }}
                onBlur={() => setTimeout(() => { setShowTagInput(false); setTagSearch('') }, 150)}
                placeholder="Ajouter un tag…"
                autoFocus
                className="text-xs px-2 py-0.5 bg-surface border border-border rounded-full outline-none text-text-primary placeholder:text-text-muted w-32 focus:border-accent/50"
              />
              {(filteredTags.length > 0 || tagSearch.trim()) && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-surface border border-border rounded-lg shadow-xl z-30 py-1 animate-fade-in">
                  {filteredTags.slice(0, 6).map((t) => (
                    <button
                      key={t.id}
                      onMouseDown={() => addTag(t)}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-hover transition-colors flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
                      {t.name}
                    </button>
                  ))}
                  {tagSearch.trim() && !allTags.find((t) => t.name.toLowerCase() === tagSearch.toLowerCase().trim()) && (
                    <button
                      onMouseDown={createAndAddTag}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-hover transition-colors flex items-center gap-2 text-accent-light border-t border-border/50 mt-1 pt-2"
                    >
                      <Plus size={11} />
                      Créer «{tagSearch.trim()}»
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => { setShowTagInput(true); setTimeout(() => tagInputRef.current?.focus(), 0) }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-text-muted border border-dashed border-border/50 hover:border-accent/50 hover:text-accent-light transition-colors"
            >
              <Plus size={10} />
              Tag
            </button>
          )}
        </div>
      </div>

      {/* ── Editor + TOC ── */}
      <div className="flex flex-1 overflow-hidden">
        <MarkdownEditor
          value={content}
          onChange={setContent}
          mode={editorMode}
          onModeChange={setEditorMode}
          onSave={() => saveContent(content)}
          focusMode={focusMode}
          onFocusModeToggle={() => setFocusMode((v) => !v)}
          editorFont={editorFont}
          fontSize={fontSize}
          className="flex-1"
        />

        {/* TOC panel */}
        {showToc && (
          <div className="w-56 border-l border-border bg-surface shrink-0 overflow-hidden flex flex-col">
            <TableOfContents content={content} />
          </div>
        )}
      </div>

      {/* ── Status bar ── */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-border bg-surface shrink-0">
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>{words} mots</span>
          <span>·</span>
          <span>{chars} caractères</span>
        </div>
        <div className="text-xs text-text-muted">
          {note.updated_at && (
            <span>
              Modifié{' '}
              {new Date(note.updated_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      </div>

      {/* ── Version history modal ── */}
      <VersionHistoryModal
        noteId={note.id}
        isOpen={showVersions}
        onClose={() => setShowVersions(false)}
        onRestore={handleRestore}
      />
    </div>
  )
}
