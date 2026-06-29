"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  LayoutGrid,
  List,
  Plus,
  GripVertical,
  FileText,
  Calendar,
  Clock,
  Edit3,
  Folder,
} from "lucide-react";
import { cn, formatDateShortFr } from "@/lib/utils";
import { getSupabaseBrowser } from "@/lib/supabase";
import type { Note, Project, Tag } from "@/types";
import { ICON_MAP } from "./ProjectModal";
import ProjectModal from "./ProjectModal";

type ProjectWithCount = Project & { note_count: number };

// ── Sortable Note Card ────────────────────────────────────────

interface SortableNoteCardProps {
  note: Note;
  viewMode: "grid" | "list";
}

function SortableNoteCard({ note, viewMode }: SortableNoteCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const isDone =
    note.tags?.some((t) => t.name === "done" || t.name === "terminé") ||
    note.title.includes("[x]");

  const cleanExcerpt = note.content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#*`>\-_~]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);

  if (viewMode === "list") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "group flex items-center gap-3 px-3 py-2.5 bg-surface border rounded-lg transition-all",
          isDragging
            ? "border-accent/50 shadow-lg"
            : "border-border hover:border-border-strong",
        )}
      >
        <button
          {...attributes}
          {...listeners}
          className="text-text-muted hover:text-text-secondary cursor-grab active:cursor-grabbing flex-shrink-0"
        >
          <GripVertical size={14} />
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {note.type === "calendar" ? (
            <Calendar size={13} className="text-text-muted flex-shrink-0" />
          ) : (
            <FileText size={13} className="text-text-muted flex-shrink-0" />
          )}
          <p
            className={cn(
              "text-sm font-medium truncate",
              isDone ? "line-through text-text-muted" : "text-text-primary",
            )}
          >
            {note.title || "Sans titre"}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {note.tags && note.tags.length > 0 && (
            <div className="flex gap-1">
              {note.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag.id}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: tag.color }}
                  title={tag.name}
                />
              ))}
            </div>
          )}
          {note.date && (
            <span className="text-xs text-text-muted whitespace-nowrap">
              {formatDateShortFr(note.date)}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex flex-col bg-surface border rounded-lg p-4 transition-all min-h-[120px]",
        isDragging
          ? "border-accent/50 shadow-lg"
          : "border-border hover:border-border-strong",
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute top-2.5 right-2.5 text-text-muted hover:text-text-secondary
                   cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical size={13} />
      </button>

      {/* Title */}
      <p
        className={cn(
          "text-sm font-medium line-clamp-2 mb-2 pr-5",
          isDone ? "line-through text-text-muted" : "text-text-primary",
        )}
      >
        {note.title || "Sans titre"}
      </p>

      {/* Excerpt */}
      {cleanExcerpt && (
        <p className="text-xs text-text-muted line-clamp-3 flex-1 mb-3">
          {cleanExcerpt}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 mt-auto">
        <span className="flex items-center gap-1 text-xs text-text-muted">
          {note.type === "calendar" ? (
            <>
              <Calendar size={10} />
              {note.date ? formatDateShortFr(note.date) : "—"}
            </>
          ) : (
            <>
              <Clock size={10} />
              {formatDateShortFr(note.updated_at)}
            </>
          )}
        </span>
        {note.tags && note.tags.length > 0 && (
          <div className="flex gap-1">
            {note.tags.slice(0, 5).map((tag) => (
              <span
                key={tag.id}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: tag.color }}
                title={tag.name}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ProjectView ───────────────────────────────────────────────

interface ProjectViewProps {
  project: ProjectWithCount;
  onProjectUpdated: (project: ProjectWithCount) => void;
  onAddNote: (projectId: string) => void;
}

export default function ProjectView({
  project,
  onProjectUpdated,
  onAddNote,
}: ProjectViewProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [editOpen, setEditOpen] = useState(false);

  const Icon = ICON_MAP[project.icon] ?? Folder;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("notes")
        .select("*, tags:notes_tags(tag:tags(*))")
        .eq("project_id", project.id)
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const normalized: Note[] = (data ?? []).map(
        (note: Record<string, unknown>) => ({
          ...(note as Omit<Note, "tags">),
          tags: ((note.tags as Array<{ tag: Tag | null }> | null) ?? [])
            .map((t) => t.tag)
            .filter((t): t is Tag => t !== null),
        }),
      );
      setNotes(normalized);
    } catch (err) {
      console.error("Failed to fetch project notes:", err);
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setNotes((prev) => {
      const oldIdx = prev.findIndex((n) => n.id === active.id);
      const newIdx = prev.findIndex((n) => n.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  }

  async function handleEditSave(data: {
    name: string;
    color: string;
    icon: string;
  }) {
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const json = await res.json();
      onProjectUpdated({ ...json.data, note_count: project.note_count });
    }
  }

  // Progress calculation
  const doneCount = notes.filter(
    (n) =>
      n.tags?.some((t) => t.name === "done" || t.name === "terminé") ||
      n.title.includes("[x]"),
  ).length;
  const progress =
    notes.length > 0 ? Math.round((doneCount / notes.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Project header */}
      <div className="px-6 py-5 border-b border-border flex-shrink-0">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: project.color + "22",
                border: `1px solid ${project.color}44`,
              }}
            >
              <Icon size={24} style={{ color: project.color }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">
                {project.name}
              </h1>
              <p className="text-sm text-text-muted">
                {project.note_count} note{project.note_count !== 1 ? "s" : ""}
                {notes.length > 0 && ` · ${progress}% complété`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary
                         hover:text-text-primary bg-surface-hover border border-border
                         rounded-lg transition-all hover:border-border-strong"
            >
              <Edit3 size={13} />
              Modifier
            </button>
            <button
              onClick={() => onAddNote(project.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent
                         hover:bg-accent-hover text-white rounded-lg transition-colors"
            >
              <Plus size={13} />
              Ajouter une note
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {notes.length > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
              <span>Progression</span>
              <span>
                {doneCount}/{notes.length} terminée{doneCount !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  backgroundColor: project.color,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-border flex-shrink-0">
        <span className="text-xs text-text-muted">
          {loading
            ? "Chargement…"
            : `${notes.length} note${notes.length !== 1 ? "s" : ""}`}
        </span>
        <div className="flex items-center gap-0.5 bg-surface-hover rounded-lg p-0.5">
          {(["grid", "list"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-md transition-all",
                viewMode === mode
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-muted hover:text-text-primary",
              )}
              title={mode === "grid" ? "Grille" : "Liste"}
            >
              {mode === "grid" ? <LayoutGrid size={13} /> : <List size={13} />}
            </button>
          ))}
        </div>
      </div>

      {/* Notes area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-32 bg-surface border border-border rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[240px] text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{
                backgroundColor: project.color + "15",
                border: `1px solid ${project.color}30`,
              }}
            >
              <Icon size={28} style={{ color: project.color, opacity: 0.6 }} />
            </div>
            <p className="text-text-secondary font-medium mb-1">
              Aucune note dans ce projet
            </p>
            <p className="text-text-muted text-sm mb-4">
              Commencez à organiser vos idées
            </p>
            <button
              onClick={() => onAddNote(project.id)}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover
                         text-white text-sm rounded-lg transition-colors"
            >
              <Plus size={14} />
              Ajouter une note
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={notes.map((n) => n.id)}
              strategy={
                viewMode === "grid"
                  ? rectSortingStrategy
                  : verticalListSortingStrategy
              }
            >
              <div
                className={cn(
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
                    : "flex flex-col gap-1.5",
                )}
              >
                {notes.map((note) => (
                  <SortableNoteCard
                    key={note.id}
                    note={note}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Edit project modal */}
      <ProjectModal
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
        onSave={handleEditSave}
      />
    </div>
  );
}
