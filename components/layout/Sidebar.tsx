"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import { useAppStore } from "@/store/app";
import { useTimerStore } from "@/store/timer";
import type { Widget } from "@/types";

// ── Nav items ──────────────────────────────────────────────────
const NAV_ITEMS: { label: string; icon: LucideIcon; href: string }[] = [
  { label: "Calendrier / Journal", icon: CalendarDays, href: "/calendar" },
  { label: "Bloc-notes", icon: FileText, href: "/notes" },
  { label: "Projets", icon: FolderOpen, href: "/projects" },
  { label: "Widgets", icon: Puzzle, href: "/widgets" },
  { label: "Tags", icon: Tag, href: "/tags" },
  { label: "Recherche", icon: Search, href: "/search" },
];

// ── Tooltip (collapsed mode) ───────────────────────────────────
function Tooltip({ label }: { label: string }) {
  return (
    <div
      className={cn(
        "absolute left-full ml-3 px-2.5 py-1.5 z-50",
        "bg-surface-elevated border border-border rounded-lg",
        "text-xs text-text-primary whitespace-nowrap shadow-lg shadow-black/30",
        "pointer-events-none",
        "opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0",
        "transition-all duration-150",
      )}
    >
      {label}
    </div>
  );
}

// ── Nav link ───────────────────────────────────────────────────
function NavLink({
  item,
  isActive,
  collapsed,
}: {
  item: { label: string; icon: LucideIcon; href: string };
  isActive: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex items-center gap-3 rounded-lg text-sm group transition-all duration-200",
        "outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
        isActive
          ? "bg-accent text-white font-medium shadow-md shadow-accent/20"
          : "text-text-secondary hover:text-text-primary hover:bg-surface-hover",
      )}
    >
      <Icon
        className={cn(
          "shrink-0 w-[18px] h-[18px]",
          isActive
            ? "text-white"
            : "text-text-muted group-hover:text-text-primary transition-colors duration-200",
        )}
        strokeWidth={isActive ? 2 : 1.75}
      />
      {!collapsed && (
        <span className="truncate leading-none">{item.label}</span>
      )}
      {collapsed && <Tooltip label={item.label} />}
    </Link>
  );
}

// ── Timer mini ─────────────────────────────────────────────────
function TimerMini({ collapsed }: { collapsed: boolean }) {
  const isRunning = useTimerStore((s) => s.isRunning);
  const [t, setT] = useState(0);
  const iv = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setT(useTimerStore.getState().getCurrentTime());
    if (!isRunning) {
      if (iv.current) clearInterval(iv.current);
      return;
    }
    iv.current = setInterval(
      () => setT(useTimerStore.getState().getCurrentTime()),
      100,
    );
    return () => {
      if (iv.current) clearInterval(iv.current);
    };
  }, [isRunning]);

  if (!isRunning) return null;
  if (collapsed)
    return (
      <span className="absolute -top-1 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-blink ring-2 ring-surface" />
    );
  return (
    <span className="ml-auto flex items-center gap-1.5 shrink-0">
      <span className="text-[11px] font-mono tabular-nums text-red-400">
        {formatTime(t, false)}
      </span>
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-blink" />
    </span>
  );
}

// ── Section label ──────────────────────────────────────────────
function SectionLabel({
  label,
  collapsed,
}: {
  label: string;
  collapsed: boolean;
}) {
  if (collapsed)
    return <div className="my-2 mx-auto w-6 border-t border-border/50" />;
  return (
    <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-muted select-none">
      {label}
    </p>
  );
}

// ── Sidebar Widget iframe ──────────────────────────────────────
// Strips export default so Widget() is a plain global function
function sanitizeCode(raw: string) {
  return raw
    .replace(/export\s+default\s+function\s+/g, "function ")
    .replace(/^\s*export\s+default\s+\w+\s*;?\s*$/gm, "");
}

function buildWidgetHtml(code: string) {
  const safe = sanitizeCode(code);
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Inter,system-ui,sans-serif;color:#e2e8f0;background:transparent;font-size:13px;overflow:hidden;}</style>
</head><body>
<div id="root"></div>
<script type="text/babel" data-presets="react">
${safe}
try{ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Widget));}
catch(e){document.getElementById('root').innerHTML='<div style="color:#f87171;font-size:11px;padding:4px">⚠ '+e.message+'</div>';}
</script></body></html>`;
}

function SidebarWidget({ widget }: { widget: Widget }) {
  return (
    <div className="mx-2 mb-2 rounded-lg overflow-hidden border border-border bg-background">
      <div className="px-2 py-1 flex items-center gap-1.5 border-b border-border/50">
        <Puzzle size={10} className="text-accent shrink-0" />
        <span className="text-[10px] text-text-muted truncate">
          {widget.name}
        </span>
      </div>
      <iframe
        srcDoc={buildWidgetHtml(widget.code)}
        sandbox="allow-scripts"
        title={widget.name}
        style={{
          width: "100%",
          height: 80,
          border: "none",
          display: "block",
          background: "transparent",
        }}
      />
    </div>
  );
}

// ── Main Sidebar ───────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, theme, setTheme } = useAppStore();
  const collapsed = !sidebarOpen;
  const isTimerRunning = useTimerStore((s) => s.isRunning);

  // Sidebar widgets
  const [sidebarWidgets, setSidebarWidgets] = useState<Widget[]>([]);

  useEffect(() => {
    fetch("/api/widgets")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!json?.data) return;
        const active = (json.data as Widget[]).filter(
          (w) => w.is_active && w.position === "sidebar",
        );
        setSidebarWidgets(active);
      })
      .catch(() => {});
  }, []);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen shrink-0",
        "bg-surface border-r border-border",
        "transition-[width] duration-200 ease-in-out overflow-hidden",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center border-b border-border shrink-0 transition-all duration-200",
          collapsed ? "justify-center px-0 h-14" : "gap-2.5 px-4 h-14",
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

      {/* Search bar */}
      {!collapsed && (
        <div className="px-3 py-2.5 border-b border-border shrink-0">
          <Link
            href="/search"
            className={cn(
              "flex items-center gap-2 px-3 py-2 w-full rounded-lg",
              "bg-background border border-border text-text-muted text-sm",
              "hover:border-border-strong hover:text-text-secondary transition-colors duration-200",
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

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5 min-h-0">
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

        <div>
          <SectionLabel label="Outils" collapsed={collapsed} />
          <div className="space-y-0.5">
            {/* Timer */}
            <Link
              href="/timer"
              className={cn(
                "relative flex items-center gap-3 rounded-lg text-sm group transition-all duration-200",
                collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                isActive("/timer")
                  ? "bg-accent text-white font-medium shadow-md shadow-accent/20"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover",
              )}
            >
              <span className="relative shrink-0">
                <Timer
                  className={cn(
                    "w-[18px] h-[18px]",
                    isActive("/timer")
                      ? "text-white"
                      : cn(
                          "text-text-muted group-hover:text-text-primary transition-colors duration-200",
                          isTimerRunning && "text-red-400",
                        ),
                  )}
                  strokeWidth={isActive("/timer") ? 2 : 1.75}
                />
                {isTimerRunning && collapsed && (
                  <span className="absolute -top-1 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-blink ring-2 ring-surface" />
                )}
              </span>
              {!collapsed && (
                <>
                  <span className="truncate leading-none">Timer</span>
                  <TimerMini collapsed={false} />
                </>
              )}
              {collapsed && <Tooltip label="Timer" />}
            </Link>

            <NavLink
              item={{ label: "Paramètres", icon: Settings, href: "/settings" }}
              isActive={isActive("/settings")}
              collapsed={collapsed}
            />
          </div>
        </div>

        {/* ── Sidebar widgets ───────────────────────────────── */}
        {!collapsed && sidebarWidgets.length > 0 && (
          <div className="mt-3">
            <SectionLabel label="Widgets" collapsed={collapsed} />
            {sidebarWidgets.map((w) => (
              <SidebarWidget key={w.id} widget={w} />
            ))}
          </div>
        )}
      </nav>

      {/* Bottom bar */}
      <div
        className={cn(
          "shrink-0 border-t border-border flex items-center gap-1 px-2 py-2.5",
          collapsed ? "flex-col" : "flex-row",
        )}
      >
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="relative group flex items-center justify-center w-9 h-9 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors duration-200"
          title={theme === "dark" ? "Mode clair" : "Mode sombre"}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" strokeWidth={1.75} />
          ) : (
            <Moon className="w-4 h-4" strokeWidth={1.75} />
          )}
          {collapsed && (
            <Tooltip label={theme === "dark" ? "Mode clair" : "Mode sombre"} />
          )}
        </button>

        {!collapsed && <div className="flex-1" />}

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="relative group flex items-center justify-center w-9 h-9 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors duration-200"
          title={collapsed ? "Développer" : "Réduire"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
          ) : (
            <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
          )}
          {collapsed && <Tooltip label="Développer" />}
        </button>
      </div>
    </aside>
  );
}
