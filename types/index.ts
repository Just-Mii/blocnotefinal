// ============================================================
// Core Data Types — shared across the entire application
// ============================================================

export interface Note {
  id: string
  title: string
  content: string
  type: 'calendar' | 'standalone'
  date: string | null        // ISO date string YYYY-MM-DD
  hour: number | null        // 0-23 for calendar slots
  project_id: string | null
  is_favorite: boolean
  is_deleted: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
  tags?: Tag[]
}

export interface DailyJournal {
  id: string
  date: string               // YYYY-MM-DD
  content: string            // Markdown
  mood: string | null
  created_at: string
  updated_at: string
  tags?: Tag[]
}

export interface NoteVersion {
  id: string
  note_id: string
  content: string
  saved_at: string
}

export interface Project {
  id: string
  name: string
  color: string
  icon: string
  created_at: string
}

export interface Tag {
  id: string
  name: string
  color: string
  note_count?: number
}

export interface Widget {
  id: string
  name: string
  code: string
  secrets: Record<string, string>   // encrypted in DB
  storage: Record<string, unknown>
  size: 'small' | 'medium' | 'large'
  position: 'sidebar' | 'float' | 'page'
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// ============================================================
// Timer
// ============================================================

export interface Lap {
  index: number
  time: number               // absolute ms
  delta: number              // ms since previous lap
}

export interface TimerState {
  mode: 'stopwatch' | 'countdown'
  isRunning: boolean
  startedAt: number | null   // performance.now() snapshot
  elapsed: number            // ms accumulated before last start
  countdownTarget: number    // ms
  laps: Lap[]
  linkedNoteId: string | null
}

// ============================================================
// App-wide Settings (persisted via Supabase user_settings)
// ============================================================

export interface AppSettings {
  theme: 'dark' | 'light'
  editorFont: 'mono' | 'sans'
  fontSize: number           // 12-20
  maxEditorWidth: number     // px
  showMilliseconds: boolean
  alertSound: string
  showTimerInSidebar: boolean
  sessionTimeout: number     // minutes; 0 = never
}

// ============================================================
// Search
// ============================================================

export interface SearchResult {
  id: string
  type: 'note' | 'journal' | 'calendar'
  title: string
  excerpt: string
  date?: string
  tags?: Tag[]
}

// ============================================================
// API response helpers
// ============================================================

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string }

// ============================================================
// Session (iron-session)
// ============================================================

export interface SessionData {
  isLoggedIn: boolean
  lastActivity: number       // Date.now() ms
}
