'use client'

import { useEffect, useRef, useCallback } from 'react'
import {
  EditorView,
  keymap,
  ViewUpdate,
  placeholder as cmPlaceholder,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  highlightActiveLine,
} from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { markdown } from '@codemirror/lang-markdown'
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands'
import { bracketMatching, indentOnInput } from '@codemirror/language'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import {
  Eye,
  Edit3,
  Columns,
  Bold,
  Italic,
  Link,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Quote,
  List,
  ListOrdered,
  Minus,
  Maximize2,
  Minimize2,
} from 'lucide-react'

export interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  mode?: 'edit' | 'preview' | 'split'
  onModeChange?: (mode: 'edit' | 'preview' | 'split') => void
  onSave?: () => void
  focusMode?: boolean
  onFocusModeToggle?: () => void
  className?: string
  placeholder?: string
  editorFont?: 'mono' | 'sans'
  fontSize?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wrapSelection(view: EditorView, wrapper: string): boolean {
  const { state } = view
  const { from, to } = state.selection.main
  const selected = state.sliceDoc(from, to)

  if (selected) {
    view.dispatch({
      changes: { from, to, insert: `${wrapper}${selected}${wrapper}` },
      selection: { anchor: from + wrapper.length, head: to + wrapper.length },
    })
  } else {
    view.dispatch({
      changes: { from, insert: `${wrapper}${wrapper}` },
      selection: { anchor: from + wrapper.length },
    })
  }
  return true
}

function insertLink(view: EditorView): boolean {
  const { state } = view
  const { from, to } = state.selection.main
  const selected = state.sliceDoc(from, to)

  if (selected) {
    const insert = `[${selected}](url)`
    view.dispatch({
      changes: { from, to, insert },
      selection: { anchor: from + selected.length + 3, head: from + insert.length - 1 },
    })
  } else {
    const insert = '[texte](url)'
    view.dispatch({
      changes: { from, insert },
      selection: { anchor: from + 1, head: from + 6 },
    })
  }
  return true
}

function insertHeading(view: EditorView, level: number): boolean {
  const { state } = view
  const { from } = state.selection.main
  const line = state.doc.lineAt(from)
  const prefix = '#'.repeat(level) + ' '

  // Remove existing heading markers if any
  const stripped = line.text.replace(/^#{1,6}\s/, '')
  view.dispatch({
    changes: { from: line.from, to: line.to, insert: prefix + stripped },
    selection: { anchor: line.from + prefix.length + stripped.length },
  })
  return true
}

function insertBlock(view: EditorView, syntax: string, cursorOffset = 0): boolean {
  const { state } = view
  const { from, to } = state.selection.main
  const selected = state.sliceDoc(from, to)
  const insert = syntax.replace('{{selection}}', selected)
  const anchor = from + cursorOffset

  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor },
  })
  return true
}

// ─── Markdown preview components ──────────────────────────────────────────────

const previewComponents = {
  h1: ({ children }: any) => (
    <h1 className="text-2xl font-bold text-text-primary mt-6 mb-3 pb-2 border-b border-border">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-xl font-semibold text-text-primary mt-5 mb-2 pb-1 border-b border-border">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-lg font-semibold text-text-primary mt-4 mb-2">{children}</h3>
  ),
  h4: ({ children }: any) => (
    <h4 className="text-base font-semibold text-text-primary mt-3 mb-1">{children}</h4>
  ),
  p: ({ children }: any) => (
    <p className="text-text-secondary leading-relaxed mb-3">{children}</p>
  ),
  a: ({ href, children }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent-light hover:text-accent underline underline-offset-2 transition-colors"
    >
      {children}
    </a>
  ),
  strong: ({ children }: any) => (
    <strong className="font-bold text-text-primary">{children}</strong>
  ),
  em: ({ children }: any) => <em className="italic text-text-secondary">{children}</em>,
  code: ({ inline, className, children }: any) => {
    if (inline) {
      return (
        <code className="bg-background-secondary text-accent-light font-mono text-sm px-1.5 py-0.5 rounded">
          {children}
        </code>
      )
    }
    return (
      <code className={cn('font-mono text-sm', className)}>
        {children}
      </code>
    )
  },
  pre: ({ children }: any) => (
    <pre className="bg-background-secondary border border-border rounded-lg p-4 overflow-x-auto my-4 text-sm font-mono text-text-secondary">
      {children}
    </pre>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-accent pl-4 my-3 text-text-muted italic">
      {children}
    </blockquote>
  ),
  ul: ({ children }: any) => (
    <ul className="list-disc list-inside space-y-1 mb-3 text-text-secondary pl-2">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal list-inside space-y-1 mb-3 text-text-secondary pl-2">{children}</ol>
  ),
  li: ({ children }: any) => <li className="text-text-secondary">{children}</li>,
  hr: () => <hr className="border-border my-4" />,
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-4">
      <table className="w-full border-collapse text-sm text-text-secondary">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => <thead className="bg-surface">{children}</thead>,
  th: ({ children }: any) => (
    <th className="border border-border px-3 py-2 text-left font-semibold text-text-primary">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="border border-border px-3 py-2">{children}</td>
  ),
  tr: ({ children }: any) => <tr className="hover:bg-surface-hover transition-colors">{children}</tr>,
  img: ({ src, alt }: any) => (
    <img src={src} alt={alt} className="max-w-full rounded-lg my-4 border border-border" />
  ),
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function MarkdownEditor({
  value,
  onChange,
  mode = 'edit',
  onModeChange,
  onSave,
  focusMode = false,
  onFocusModeToggle,
  className,
  placeholder = 'Commencez à écrire en Markdown…',
  editorFont = 'mono',
  fontSize = 14,
}: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const onSaveRef = useRef(onSave)
  const onModeChangeRef = useRef(onModeChange)
  const onFocusModeRef = useRef(onFocusModeToggle)
  const fontCompartment = useRef(new Compartment())

  // Keep refs current
  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useEffect(() => { onSaveRef.current = onSave }, [onSave])
  useEffect(() => { onModeChangeRef.current = onModeChange }, [onModeChange])
  useEffect(() => { onFocusModeRef.current = onFocusModeToggle }, [onFocusModeToggle])

  // Build font/size theme extension
  const buildFontTheme = useCallback((font: 'mono' | 'sans', size: number) =>
    EditorView.theme({
      '.cm-content': {
        fontFamily:
          font === 'mono'
            ? "'JetBrains Mono', 'Fira Code', Menlo, monospace"
            : "'Inter', Geist, system-ui, sans-serif",
        fontSize: `${size}px`,
        padding: '16px 20px',
        lineHeight: '1.75',
      },
    }), [])

  // Initialise CodeMirror once
  useEffect(() => {
    if (!containerRef.current) return

    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        highlightSpecialChars(),
        drawSelection(),
        dropCursor(),
        bracketMatching(),
        indentOnInput(),
        highlightActiveLine(),
        EditorView.lineWrapping,
        oneDark,
        markdown(),
        cmPlaceholder(placeholder),
        fontCompartment.current.of(buildFontTheme(editorFont, fontSize)),

        // Custom keyboard shortcuts
        keymap.of([
          {
            key: 'Ctrl-b',
            mac: 'Cmd-b',
            run: (view) => wrapSelection(view, '**'),
          },
          {
            key: 'Ctrl-i',
            mac: 'Cmd-i',
            run: (view) => wrapSelection(view, '*'),
          },
          {
            key: 'Ctrl-k',
            mac: 'Cmd-k',
            run: insertLink,
          },
          {
            key: 'Ctrl-s',
            mac: 'Cmd-s',
            run: () => {
              onSaveRef.current?.()
              return true
            },
          },
          {
            key: 'Ctrl-Shift-p',
            mac: 'Cmd-Shift-p',
            run: () => {
              const next =
                mode === 'edit' ? 'preview' : mode === 'preview' ? 'split' : 'edit'
              onModeChangeRef.current?.(next)
              return true
            },
          },
          {
            key: 'F11',
            run: () => {
              onFocusModeRef.current?.()
              return true
            },
          },
        ]),
        keymap.of([...defaultKeymap, ...historyKeymap]),

        EditorView.updateListener.of((update: ViewUpdate) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString())
          }
        }),

        EditorView.theme({
          '&': { height: '100%', background: '#0f0f0f' },
          '&.cm-editor.cm-focused': { outline: 'none' },
          '.cm-scroller': { overflow: 'auto', height: '100%' },
          '.cm-gutters': {
            background: '#0f0f0f',
            borderRight: '1px solid rgba(255,255,255,0.06)',
          },
          '.cm-cursor': { borderLeftColor: '#8b5cf6' },
          '.cm-selectionBackground': { background: 'rgba(124,58,237,0.25) !important' },
          '&.cm-focused .cm-selectionBackground': {
            background: 'rgba(124,58,237,0.3) !important',
          },
          '.cm-activeLineGutter': { background: 'rgba(255,255,255,0.03)' },
          '.cm-activeLine': { background: 'rgba(255,255,255,0.02)' },
        }),
      ],
    })

    viewRef.current = new EditorView({ state, parent: containerRef.current })

    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync external value → editor without disrupting cursor
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      })
    }
  }, [value])

  // Reconfigure font/size on change
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: fontCompartment.current.reconfigure(buildFontTheme(editorFont, fontSize)),
    })
  }, [editorFont, fontSize, buildFontTheme])

  // Format toolbar actions (called from buttons, not keybindings)
  const formatAction = useCallback((action: string) => {
    const view = viewRef.current
    if (!view) return
    view.focus()
    switch (action) {
      case 'bold':        wrapSelection(view, '**'); break
      case 'italic':      wrapSelection(view, '*'); break
      case 'link':        insertLink(view); break
      case 'h1':          insertHeading(view, 1); break
      case 'h2':          insertHeading(view, 2); break
      case 'h3':          insertHeading(view, 3); break
      case 'inline-code': wrapSelection(view, '`'); break
      case 'blockquote':
        insertBlock(view, '> {{selection}}', 2); break
      case 'ul':
        insertBlock(view, '- {{selection}}', 2); break
      case 'ol':
        insertBlock(view, '1. {{selection}}', 3); break
      case 'hr':
        insertBlock(view, '\n---\n', 5); break
      case 'code-block': {
        const { state } = view
        const { from, to } = state.selection.main
        const selected = state.sliceDoc(from, to)
        const insert = `\`\`\`\n${selected}\n\`\`\``
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + 4 + selected.length },
        })
        break
      }
    }
  }, [])

  const handleModeChange = (m: 'edit' | 'preview' | 'split') => {
    onModeChange?.(m)
  }

  const showEditor = mode === 'edit' || mode === 'split'
  const showPreview = mode === 'preview' || mode === 'split'

  return (
    <div className={cn('flex flex-col h-full bg-background overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-surface shrink-0">
        {/* Format buttons */}
        <div className="flex items-center gap-0.5">
          {[
            { icon: Bold,         action: 'bold',        title: 'Gras (Ctrl+B)' },
            { icon: Italic,       action: 'italic',      title: 'Italique (Ctrl+I)' },
            { icon: Link,         action: 'link',        title: 'Lien (Ctrl+K)' },
          ].map(({ icon: Icon, action, title }) => (
            <button
              key={action}
              onMouseDown={(e) => { e.preventDefault(); formatAction(action) }}
              title={title}
              className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              <Icon size={14} />
            </button>
          ))}

          <div className="w-px h-4 bg-border mx-1" />

          {[
            { icon: Heading1, action: 'h1', title: 'Titre 1' },
            { icon: Heading2, action: 'h2', title: 'Titre 2' },
            { icon: Heading3, action: 'h3', title: 'Titre 3' },
          ].map(({ icon: Icon, action, title }) => (
            <button
              key={action}
              onMouseDown={(e) => { e.preventDefault(); formatAction(action) }}
              title={title}
              className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              <Icon size={14} />
            </button>
          ))}

          <div className="w-px h-4 bg-border mx-1" />

          {[
            { icon: Code,         action: 'inline-code', title: 'Code inline' },
            { icon: Quote,        action: 'blockquote',  title: 'Citation' },
            { icon: List,         action: 'ul',          title: 'Liste non ordonnée' },
            { icon: ListOrdered,  action: 'ol',          title: 'Liste ordonnée' },
            { icon: Minus,        action: 'hr',          title: 'Séparateur horizontal' },
          ].map(({ icon: Icon, action, title }) => (
            <button
              key={action}
              onMouseDown={(e) => { e.preventDefault(); formatAction(action) }}
              title={title}
              className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              <Icon size={14} />
            </button>
          ))}
        </div>

        {/* Right: mode switcher + focus mode */}
        <div className="flex items-center gap-1">
          {/* Mode switcher */}
          <div className="flex items-center bg-background rounded-md p-0.5 border border-border">
            {(
              [
                { m: 'edit' as const,    icon: Edit3,   label: 'Écrire' },
                { m: 'split' as const,   icon: Columns, label: 'Split' },
                { m: 'preview' as const, icon: Eye,     label: 'Aperçu' },
              ] as const
            ).map(({ m, icon: Icon, label }) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                title={label}
                className={cn(
                  'px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors',
                  mode === m
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                <Icon size={12} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Focus mode */}
          {onFocusModeToggle && (
            <button
              onClick={onFocusModeToggle}
              title={focusMode ? 'Quitter le mode focus (F11)' : 'Mode focus (F11)'}
              className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              {focusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Editor / Preview area */}
      <div className="flex flex-1 overflow-hidden">
        {/* CodeMirror */}
        <div
          ref={containerRef}
          className={cn(
            'overflow-hidden',
            showEditor ? 'flex-1' : 'hidden',
            showPreview && 'border-r border-border'
          )}
          style={{ minWidth: 0 }}
        />

        {/* Preview */}
        {showPreview && (
          <div
            ref={previewRef}
            className={cn(
              'flex-1 overflow-y-auto px-8 py-6',
              mode === 'preview' && 'max-w-3xl mx-auto w-full'
            )}
            style={{ minWidth: 0 }}
          >
            {value.trim() ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={previewComponents}
              >
                {value}
              </ReactMarkdown>
            ) : (
              <p className="text-text-muted italic text-sm">
                L'aperçu s'affiche ici…
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
