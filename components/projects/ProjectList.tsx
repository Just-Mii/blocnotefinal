'use client'

import { Pencil, Trash2, Plus, Folder } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Project } from '@/types'
import { ICON_MAP } from './ProjectModal'

type ProjectWithCount = Project & { note_count: number }

interface ProjectListProps {
  projects: ProjectWithCount[]
  selectedId: string | null
  onSelect: (id: string) => void
  onEdit: (project: ProjectWithCount) => void
  onDelete: (id: string) => void
  onNew: () => void
}

export default function ProjectList({
  projects,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  onNew,
}: ProjectListProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Sidebar header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Projets
        </span>
        <button
          onClick={onNew}
          title="Nouveau projet"
          className="w-6 h-6 flex items-center justify-center rounded-md text-text-muted
                     hover:text-accent hover:bg-accent/10 transition-all"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {projects.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="w-12 h-12 bg-surface-hover rounded-xl flex items-center justify-center mx-auto mb-3">
              <Folder size={20} className="text-text-muted" />
            </div>
            <p className="text-sm text-text-muted mb-1">Aucun projet</p>
            <button
              onClick={onNew}
              className="text-xs text-accent hover:text-accent-light transition-colors"
            >
              Créer le premier →
            </button>
          </div>
        ) : (
          <ul className="space-y-0.5 px-2">
            {projects.map((project) => {
              const Icon = ICON_MAP[project.icon] ?? Folder
              const isSelected = project.id === selectedId

              return (
                <li key={project.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(project.id)}
                    onKeyDown={(e) => e.key === 'Enter' && onSelect(project.id)}
                    className={cn(
                      'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all select-none',
                      isSelected
                        ? 'bg-accent/15 border border-accent/30'
                        : 'border border-transparent hover:bg-surface-hover'
                    )}
                  >
                    {/* Colored icon */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        backgroundColor: project.color + '22',
                        border: `1px solid ${project.color}44`,
                      }}
                    >
                      <Icon size={14} style={{ color: project.color }} />
                    </div>

                    {/* Name + count */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm font-medium truncate leading-tight',
                          isSelected ? 'text-text-primary' : 'text-text-secondary'
                        )}
                      >
                        {project.name}
                      </p>
                      <p className="text-xs text-text-muted">
                        {project.note_count} note{project.note_count !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Hover actions */}
                    <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit(project)
                        }}
                        title="Modifier"
                        className="w-6 h-6 flex items-center justify-center rounded text-text-muted
                                   hover:text-text-primary hover:bg-surface-elevated transition-all"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(project.id)
                        }}
                        title="Supprimer"
                        className="w-6 h-6 flex items-center justify-center rounded text-text-muted
                                   hover:text-red-400 hover:bg-red-400/10 transition-all"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Footer "new project" button */}
      <div className="px-3 pb-3 pt-1 border-t border-border flex-shrink-0">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-muted
                     hover:text-text-primary hover:bg-surface-hover border border-dashed border-border
                     hover:border-border-strong transition-all"
        >
          <Plus size={14} />
          Nouveau projet
        </button>
      </div>
    </div>
  )
}
