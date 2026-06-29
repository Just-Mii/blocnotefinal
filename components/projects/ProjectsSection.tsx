'use client'

import { useState, useEffect, useCallback } from 'react'
import { FolderOpen, AlertTriangle, X } from 'lucide-react'
import type { Project } from '@/types'
import ProjectList from './ProjectList'
import ProjectView from './ProjectView'
import ProjectModal from './ProjectModal'

type ProjectWithCount = Project & { note_count: number }

interface DeleteConfirm {
  id: string
  name: string
}

export default function ProjectsSection() {
  const [projects, setProjects] = useState<ProjectWithCount[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectWithCount | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null)

  // ── Data fetching ────────────────────────────────────────────

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const json = await res.json()
        setProjects(json.data ?? [])
        // Auto-select first project if nothing is selected
        setSelectedId((prev) => {
          if (prev) return prev
          return json.data?.[0]?.id ?? null
        })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // ── CRUD handlers ────────────────────────────────────────────

  function handleNew() {
    setEditingProject(null)
    setModalOpen(true)
  }

  function handleEdit(project: ProjectWithCount) {
    setEditingProject(project)
    setModalOpen(true)
  }

  async function handleSave(data: { name: string; color: string; icon: string }) {
    if (editingProject) {
      // Update
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const json = await res.json()
        setProjects((prev) =>
          prev.map((p) =>
            p.id === editingProject.id
              ? { ...json.data, note_count: editingProject.note_count }
              : p
          )
        )
      }
    } else {
      // Create
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const json = await res.json()
        setProjects((prev) => [...prev, json.data])
        setSelectedId(json.data.id)
      }
    }
  }

  function handleDeleteRequest(id: string) {
    const project = projects.find((p) => p.id === id)
    if (project) setDeleteConfirm({ id, name: project.name })
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirm) return
    const res = await fetch(`/api/projects/${deleteConfirm.id}`, { method: 'DELETE' })
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== deleteConfirm.id))
      if (selectedId === deleteConfirm.id) {
        const remaining = projects.filter((p) => p.id !== deleteConfirm.id)
        setSelectedId(remaining[0]?.id ?? null)
      }
    }
    setDeleteConfirm(null)
  }

  function handleProjectUpdated(updated: ProjectWithCount) {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  function handleAddNote(_projectId: string) {
    // TODO: wire to the note creation flow once notes section is built
    // For now, navigate to notes with the project pre-selected
    window.location.href = `/notes?project_id=${_projectId}`
  }

  // ── Selected project ─────────────────────────────────────────

  const selectedProject = projects.find((p) => p.id === selectedId) ?? null

  // ── Render ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full bg-background">
        {/* Sidebar skeleton */}
        <div className="w-64 border-r border-border bg-surface flex flex-col gap-2 p-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-surface-hover rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-text-muted text-sm">Chargement…</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* ── Left sidebar: project list ── */}
      <div className="w-64 flex-shrink-0 border-r border-border bg-surface flex flex-col overflow-hidden">
        <ProjectList
          projects={projects}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
          onNew={handleNew}
        />
      </div>

      {/* ── Right panel: project view ── */}
      <div className="flex-1 overflow-hidden">
        {selectedProject ? (
          <ProjectView
            project={selectedProject}
            onProjectUpdated={handleProjectUpdated}
            onAddNote={handleAddNote}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-20 h-20 bg-surface border border-border rounded-2xl flex items-center justify-center mb-5">
              <FolderOpen size={32} className="text-text-muted" />
            </div>
            <h2 className="text-text-primary font-semibold text-lg mb-2">
              {projects.length === 0 ? 'Créez votre premier projet' : 'Sélectionnez un projet'}
            </h2>
            <p className="text-text-muted text-sm max-w-xs mb-6">
              {projects.length === 0
                ? 'Organisez vos notes en projets pour mieux structurer votre travail.'
                : 'Choisissez un projet dans la liste pour voir ses notes.'}
            </p>
            {projects.length === 0 && (
              <button
                onClick={handleNew}
                className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg transition-colors font-medium"
              >
                Nouveau projet
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Create / Edit modal ── */}
      <ProjectModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        project={editingProject}
        onSave={handleSave}
      />

      {/* ── Delete confirmation overlay ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-border rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-red-400/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-text-primary font-semibold mb-1">Supprimer le projet</h3>
                <p className="text-sm text-text-muted">
                  Le projet{' '}
                  <span className="text-text-secondary font-medium">"{deleteConfirm.name}"</span>{' '}
                  sera supprimé. Les notes liées seront conservées mais détachées.
                </p>
              </div>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-surface-hover border border-border rounded-lg
                           text-text-secondary hover:text-text-primary transition-colors text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600
                           text-white rounded-lg transition-colors text-sm font-medium"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
