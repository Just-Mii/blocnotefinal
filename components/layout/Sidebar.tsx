'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  FileText,
  FolderOpen,
  Puzzle,
  Tag,
  Search,
  Timer,
  Settings,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/utils'
import { useAppStore } from '@/store/app'
import { useTimerStore } from '@/store/timer'

// ── Nav item definitions ───────────────────────────────────────

interface NavItemDef {
  label: string
  icon: LucideIcon
  href: string
}

const NAV_ITEMS: NavItemDef[] = [
  { label: 'Calendrier / Journal', icon: CalendarDays, href: '/calendar' },
  { label: 'Bloc-notes',           icon: FileText,     href: '/notes'    },
  { label: 'Projets',              icon: FolderOpen,   href: '/projects' },
  { label: 'Widgets',              icon: Puzzle,       href: '/widgets'  },
  { label: 'Tags',                 icon: Tag,          href: '/tags'     },
  { label: 'Recherche',            icon: Search,       href: '/search'   },
]

// ── Tooltip (collapsed mode) ───────────────────────────────────

function Tooltip({ label }: { label: string }) {
  return (
    <div
      role="tooltip"
      className={cn(
        'absolute left-full ml-3 px-2.5 py-1.5 z-50',
        'bg-surface-elevated border border-border rounded-lg',
        'text-xs text-text-primary whitespace-nowrap',
        'shadow-lg shadow-black/30',
        'pointer-events-none',
        'opacity-0 group-hover:opacity-100',
        'translate-x-1 group-hover:translate-x-0',
        'transition-all duration-150',
      )}
    >
      {label}
    </div>
  )
}

// ── Generic nav link ───────────────────────────────────────────

interface NavLinkProps {
  item: NavItemDef
  isActive: boolean
  collapsed: boolean
  extra?: React.ReactNode
}

function NavLink({ item, isActive, collapsed, extra }: NavLinkProps) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={cn(
        'relative flex items-center gap-3 rounded-lg text-sm group',
        'transition-all duration-200',
        'outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
        isActive
          ? 'bg-accent text-white font-medium shadow-md shadow-accent/20'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
      )}
    >
      <Icon
        className={cn(
          'shrink-0 w-[18px] h-[18px]',
          isActive
            ? 'text-white'
            : 'text-text-muted group-hover:text-text-primary transition-colors duration-200'
        )}
        strokeWidth={isActive ? 2 : 1.75}
      />

      {!collapsed && (
        <span className="truncate leading-none">{item.label}</span>
      )}

      {extra}

      {collapsed && <Tooltip label={item.label} />}
    </Link>
  )
}

// ── Timer mini-indicator ───────────────────────────────────────

function TimerMiniDisplay({ collapsed }: { collapsed: boolean }) {
  const isRunning = useTimerStore((s) => s.isRunning)
  const [displayTime, setDisplayTime] = useState(0)
  const rafRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Sync initial value
    setDisplayTime(useTimerStore.getState().getCurrentTime())

    if (!isRunning) {
      if (rafRef.current) clearInterval(rafRef.current)
      rafRef.current = null
      return
    }

    rafRef.current = setInterval(() => {
      setDisplayTime(useTimerStore.getState().getCurrentTime())
    }, 100)

    return () => {
      if (rafRef.current) clearInterval(rafRef.current)
    }
  }, [isRunning])

  if (!isRunning) return null

  if (collapsed) {
    return (
      <span className="absolute -top-1 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-blink ring-2 ring-surface" />
    )
  }

  return (
    <span className="ml-auto flex items-center gap-1.5 shrink-0">
      <span className="text-[11px] font-mono tabular-nums text-red-400 leading-none">
        {formatTime(displayTime, false)}
      </span>
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-blink" />
    </span>
  )
}

// ── Section label ──────────────────────────────────────────────

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return <div className="my-2 mx-auto w-6 border-t border-border/50" />
  }
  return (
    <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-muted select-none">
      {label}
    </p>
  )
}

// ── Main Sidebar ───────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, setSidebarOpen, theme, setTheme } = useAppStore()
  const collapsed = !sidebarOpen
  const isTimerRunning = useTimerStore((s) => s.isRunning)

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen shrink-0',
        'bg-surface border-r border-border',
        'transition-[width] duration-200 ease-in-out',
        'overflow-hidden',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* ── Logo ─────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center border-b border-border shrink-0',
          'transition-all duration-200',
          collapsed ? 'justify-center px-0 h-14' : 'gap-2.5 px-4 h-14'
        )}
      >
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0 shadow-md shadow-accent/30">
          <Puzzle className="w-4 h-4 text-white" strokeWidth={1.75} />
        </div>
        {!collapsed && (
          <span className="font-semibold text-text-primary tracking-tight whitespace-nowrap">
            Mon Espace
          </span>
        )}
      </div>

      {/* ── Search bar (expanded only) ───────────────────────── */}
      {!collapsed && (
        <div className="px-3 py-2.5 border-b border-border shrink-0">
          <Link
            href="/search"
            className={cn(
              'flex items-center gap-2 px-3 py-2 w-full rounded-lg',
              'bg-background border border-border',
              'text-text-muted text-sm',
              'hover:border-border-strong hover:text-text-secondary',
              'transition-colors duration-200',
              'outline-none focus-visible:ring-2 focus-visible:ring-accent/50'
            )}
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1">Rechercher…</span>
            <kbd className="text-[10px] text-text-muted bg-surface-hover px-1.5 py-0.5 rounded font-mono border border-border leading-none">
              ⌘K
            </kbd>
          </Link>
        </div>
      )}

      {/* ── Navigation ───────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5 min-h-0">

        {/* NAVIGATION section */}
        <div className="mb-2">
          <SectionLabel label="Navigation" collapsed={collapsed} />
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                isActive={isActive(item.href)}
                collapsed={collapsed}
              />
            ))}
          </div>
        </div>

        {/* OUTILS section */}
        <div>
          <SectionLabel label="Outils" collapsed={collapsed} />
          <div className="space-y-0.5">

            {/* Timer — special: blinking indicator when running */}
            <Link
              href="/timer"
              className={cn(
                'relative flex items-center gap-3 rounded-lg text-sm group',
                'transition-all duration-200',
                'outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                isActive('/timer')
                  ? 'bg-accent text-white font-medium shadow-md shadow-accent/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              )}
            >
              {/* Icon wrapper for the blink badge */}
              <span className="relative shrink-0">
                <Timer
                  className={cn(
                    'w-[18px] h-[18px]',
                    isActive('/timer')
                      ? 'text-white'
                      : cn(
                          'text-text-muted group-hover:text-text-primary transition-colors duration-200',
                          isTimerRunning && 'text-red-400 group-hover:text-red-300'
                        )
                  )}
                  strokeWidth={isActive('/timer') ? 2 : 1.75}
                />
                {/* Collapsed badge */}
                {isTimerRunning && collapsed && (
                  <span className="absolute -top-1 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-blink ring-2 ring-surface" />
                )}
              </span>

              {!collapsed && (
                <>
                  <span className="truncate leading-none">Timer</span>
                  <TimerMiniDisplay collapsed={false} />
                </>
              )}

              {collapsed && <Tooltip label="Timer" />}
            </Link>

            {/* Settings */}
            <NavLink
              item={{ label: 'Paramètres', icon: Settings, href: '/settings' }}
              isActive={isActive('/settings')}
              collapsed={collapsed}
            />
          </div>
        </div>
      </nav>

      {/* ── Bottom bar ───────────────────────────────────────── */}
      <div
        className={cn(
          'shrink-0 border-t border-border',
          'flex items-center gap-1 px-2 py-2.5',
          collapsed ? 'flex-col' : 'flex-row'
        )}
      >
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={cn(
            'relative group flex items-center justify-center',
            'w-9 h-9 rounded-lg',
            'text-text-muted hover:text-text-primary hover:bg-surface-hover',
            'transition-colors duration-200',
            'outline-none focus-visible:ring-2 focus-visible:ring-accent/50'
          )}
          title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          {theme === 'dark'
            ? <Sun className="w-4 h-4" strokeWidth={1.75} />
            : <Moon className="w-4 h-4" strokeWidth={1.75} />
          }
          {collapsed && (
            <Tooltip label={theme === 'dark' ? 'Mode clair' : 'Mode sombre'} />
          )}
        </button>

        {!collapsed && <div className="flex-1" />}

        {/* Collapse / expand toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={cn(
            'relative group flex items-center justify-center',
            'w-9 h-9 rounded-lg',
            'text-text-muted hover:text-text-primary hover:bg-surface-hover',
            'transition-colors duration-200',
            'outline-none focus-visible:ring-2 focus-visible:ring-accent/50'
          )}
          title={collapsed ? 'Développer la barre latérale' : 'Réduire la barre latérale'}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
            : <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
          }
          {collapsed && <Tooltip label="Développer" />}
        </button>
      </div>
    </aside>
  )
}
