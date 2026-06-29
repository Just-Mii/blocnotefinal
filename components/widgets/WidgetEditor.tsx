'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { X, Plus, Trash2, Eye, EyeOff, Save, Loader2, AlertTriangle } from 'lucide-react'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { indentOnInput, bracketMatching } from '@codemirror/language'
import { cn } from '@/lib/utils'
import type { Widget } from '@/types'

// ─── Iframe preview generator ─────────────────────────────────────────────────

function buildPreviewHtml(code: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js" crossorigin></script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:Inter,system-ui,sans-serif;color:#e2e8f0;background:#1e1e2e;padding:8px;font-size:14px;line-height:1.5;}
</style>
</head>
<body>
<div id="root"></div>
<script>
window.WidgetAPI={
  storage:{
    get:function(key){return new Promise(function(resolve){var id=Math.random().toString(36).slice(2);parent.postMessage({type:'storage.get',key:key,id:id},'*');function h(e){if(e.data&&e.data.type==='storage.response'&&e.data.id===id){window.removeEventListener('message',h);resolve(e.data.value);}}window.addEventListener('message',h);});},
    getSync:function(){return undefined;},
    set:function(key,val){parent.postMessage({type:'storage.set',key:key,val:val},'*');return Promise.resolve();},
  },
  fetch:function(url,opts){return new Promise(function(resolve,reject){var id=Math.random().toString(36).slice(2);parent.postMessage({type:'fetch',url:url,opts:opts||{},id:id},'*');function h(e){if(e.data&&e.data.type==='fetch.response'&&e.data.id===id){window.removeEventListener('message',h);if(e.data.error){reject(new Error(e.data.error));}else{resolve({ok:true,json:function(){return Promise.resolve(e.data.data);},data:e.data.data});}}}window.addEventListener('message',h);});},
  theme:{mode:'dark',accent:'#7c3aed'},
  notify:function(msg,type){parent.postMessage({type:'notify',msg:msg,notifyType:type||'info'},'*');},
};
</script>
<script type="text/babel" data-presets="react">
${code}

try{
  const root=ReactDOM.createRoot(document.getElementById('root'));
  root.render(React.createElement(Widget));
}catch(e){
  document.getElementById('root').innerHTML='<div style="color:#f87171;padding:8px;font-size:12px;">&#9888; '+e.message+'</div>';
}
</script>
</body>
</html>`
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SecretRow { key: string; value: string; hidden: boolean }

type Tab = 'code' | 'secrets' | 'settings'

interface WidgetEditorProps {
  widget: Widget | null
  onClose: () => void
  onSaved: (widget: Widget) => void
}

// ─── WidgetEditor ─────────────────────────────────────────────────────────────

export function WidgetEditor({ widget, onClose, onSaved }: WidgetEditorProps) {
  /* ── form state ─────────────────────────────────────────── */
  const [name, setName] = useState(widget?.name ?? '')
  const [code, setCode] = useState(widget?.code ?? DEFAULT_CODE)
  const [size, setSize] = useState<Widget['size']>(widget?.size ?? 'small')
  const [position, setPosition] = useState<Widget['position']>(widget?.position ?? 'sidebar')
  const [secrets, setSecrets] = useState<SecretRow[]>(
    Object.entries(widget?.secrets ?? {}).map(([k, v]) => ({
      key: k,
      value: v,
      hidden: true,
    })),
  )

  /* ── tabs & preview ─────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState<Tab>('code')
  const [previewVersion, setPreviewVersion] = useState(0)
  const [previewCode, setPreviewCode] = useState(code)

  // 800ms debounce to refresh preview
  useEffect(() => {
    const t = setTimeout(() => {
      setPreviewCode(code)
      setPreviewVersion((v) => v + 1)
    }, 800)
    return () => clearTimeout(t)
  }, [code])

  /* ── save state ─────────────────────────────────────────── */
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* ── CodeMirror ─────────────────────────────────────────── */
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  const onEditorUpdate = useCallback((newCode: string) => {
    setCode(newCode)
  }, [])

  useEffect(() => {
    if (!editorContainerRef.current) return

    const view = new EditorView({
      state: EditorState.create({
        doc: code,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          javascript({ jsx: true }),
          oneDark,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onEditorUpdate(update.state.doc.toString())
            }
          }),
          EditorView.theme({
            '&': { height: '100%', fontSize: '13px', backgroundColor: 'transparent' },
            '.cm-scroller': {
              overflow: 'auto',
              fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
              lineHeight: '1.65',
            },
            '.cm-focused': { outline: 'none' },
            '.cm-gutters': {
              backgroundColor: '#21222c',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              color: '#6272a4',
            },
            '.cm-activeLineGutter': { backgroundColor: 'rgba(255,255,255,0.04)' },
            '.cm-content': { caretColor: '#f8f8f2' },
          }),
        ],
      }),
      parent: editorContainerRef.current,
    })

    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // initialize once on mount

  /* ── secrets helpers ────────────────────────────────────── */
  const addSecret = () =>
    setSecrets((prev) => [...prev, { key: '', value: '', hidden: true }])

  const removeSecret = (i: number) =>
    setSecrets((prev) => prev.filter((_, idx) => idx !== i))

  const updateSecret = (
    i: number,
    field: 'key' | 'value',
    val: string,
  ) =>
    setSecrets((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)),
    )

  const toggleSecretVisibility = (i: number) =>
    setSecrets((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, hidden: !s.hidden } : s)),
    )

  /* ── save ────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!name.trim()) {
      setError('Le nom du widget est requis.')
      return
    }
    setSaving(true)
    setError(null)

    const secretsRecord: Record<string, string> = {}
    for (const { key, value } of secrets) {
      if (key.trim()) secretsRecord[key.trim()] = value
    }

    const payload = {
      name: name.trim(),
      code,
      secrets: secretsRecord,
      size,
      position,
    }

    try {
      const res = widget
        ? await fetch(`/api/widgets/${widget.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/widgets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      const { data } = await res.json()
      onSaved(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  /* ── keyboard shortcut to close ─────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  /* ── render ─────────────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative flex flex-col flex-1 m-4 bg-background rounded-2xl border border-border shadow-2xl overflow-hidden">

        {/* ── Header ────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface flex-shrink-0">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du widget…"
            className="flex-1 bg-transparent text-text-primary font-semibold text-base focus:outline-none placeholder:text-text-muted"
          />

          {/* Size selector */}
          <select
            value={size}
            onChange={(e) => setSize(e.target.value as Widget['size'])}
            className="bg-surface-elevated border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-secondary focus:outline-none focus:border-accent cursor-pointer"
          >
            <option value="small">Petit</option>
            <option value="medium">Moyen</option>
            <option value="large">Grand</option>
          </select>

          {/* Position selector */}
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value as Widget['position'])}
            className="bg-surface-elevated border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-secondary focus:outline-none focus:border-accent cursor-pointer"
          >
            <option value="sidebar">Barre latérale</option>
            <option value="float">Flottant</option>
            <option value="page">Page</option>
          </select>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors',
              'bg-accent hover:bg-accent-hover text-white disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body: split panel ─────────────────────────────── */}
        <div className="flex flex-1 min-h-0">

          {/* Left panel */}
          <div className="flex flex-col w-1/2 border-r border-border min-h-0">
            {/* Tabs */}
            <div className="flex gap-0 border-b border-border flex-shrink-0 bg-surface">
              {(['code', 'secrets', 'settings'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-4 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 -mb-px',
                    activeTab === tab
                      ? 'border-accent text-accent'
                      : 'border-transparent text-text-muted hover:text-text-secondary',
                  )}
                >
                  {tab === 'code' ? 'Code' : tab === 'secrets' ? 'Secrets' : 'Paramètres'}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto min-h-0">
              {/* Code tab */}
              {activeTab === 'code' && (
                <div
                  ref={editorContainerRef}
                  className="h-full w-full"
                />
              )}

              {/* Secrets tab */}
              {activeTab === 'secrets' && (
                <div className="p-4 space-y-3">
                  <p className="text-xs text-text-muted mb-3">
                    Les valeurs sont stockées chiffrées. Utilisez{' '}
                    <code className="text-accent-light">SECRET:NOM_CLÉ</code> dans les URLs
                    pour les injecter automatiquement via le proxy.
                  </p>

                  {secrets.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="NOM_CLÉ"
                        value={s.key}
                        onChange={(e) => updateSecret(i, 'key', e.target.value)}
                        className="w-32 bg-surface-elevated border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-accent placeholder:text-text-muted"
                      />
                      <span className="text-text-muted text-xs">=</span>
                      <div className="flex-1 relative">
                        <input
                          type={s.hidden ? 'password' : 'text'}
                          placeholder="valeur"
                          value={s.value}
                          onChange={(e) => updateSecret(i, 'value', e.target.value)}
                          className="w-full bg-surface-elevated border border-border rounded-lg px-2.5 py-1.5 pr-8 text-xs font-mono text-text-primary focus:outline-none focus:border-accent placeholder:text-text-muted"
                        />
                        <button
                          onClick={() => toggleSecretVisibility(i)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                          tabIndex={-1}
                        >
                          {s.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </div>
                      <button
                        onClick={() => removeSecret(i)}
                        className="p-1.5 rounded text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={addSecret}
                    className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-light transition-colors mt-2"
                  >
                    <Plus size={13} />
                    Ajouter un secret
                  </button>
                </div>
              )}

              {/* Settings tab */}
              {activeTab === 'settings' && (
                <div className="p-4 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Taille
                    </label>
                    <div className="flex gap-2">
                      {(['small', 'medium', 'large'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setSize(s)}
                          className={cn(
                            'flex-1 py-2 rounded-lg text-xs font-medium border transition-colors',
                            size === s
                              ? 'bg-accent/10 border-accent text-accent'
                              : 'border-border text-text-muted hover:text-text-secondary hover:border-border-strong',
                          )}
                        >
                          {s === 'small' ? 'Petit' : s === 'medium' ? 'Moyen' : 'Grand'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Position
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {(['sidebar', 'float', 'page'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setPosition(p)}
                          className={cn(
                            'flex-1 py-2 rounded-lg text-xs font-medium border transition-colors',
                            position === p
                              ? 'bg-accent/10 border-accent text-accent'
                              : 'border-border text-text-muted hover:text-text-secondary hover:border-border-strong',
                          )}
                        >
                          {p === 'sidebar' ? 'Barre latérale' : p === 'float' ? 'Flottant' : 'Page'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-text-muted leading-relaxed">
                      <strong className="text-text-secondary">Syntaxe :</strong> Définissez une
                      fonction React <code className="text-accent-light">Widget()</code> comme
                      composant principal. React et ReactDOM sont déjà chargés globalement.
                      Utilisez <code className="text-accent-light">WidgetAPI</code> pour accéder
                      au stockage, effectuer des requêtes et envoyer des notifications.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right panel — live preview */}
          <div className="flex flex-col w-1/2 min-h-0">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface flex-shrink-0">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Aperçu live
              </span>
              <span className="ml-auto text-[10px] text-text-muted bg-surface-elevated px-2 py-0.5 rounded font-mono">
                rafraîchi 800ms après modification
              </span>
            </div>
            <div className="flex-1 bg-[#1e1e2e] overflow-hidden">
              <iframe
                key={previewVersion}
                srcDoc={buildPreviewHtml(previewCode)}
                sandbox="allow-scripts"
                title="Widget preview"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>

        {/* ── Error bar ─────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border-t border-red-500/20 flex-shrink-0">
            <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
            <span className="text-xs text-red-400 flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400/60 hover:text-red-400"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Default starter code ─────────────────────────────────────────────────────

const DEFAULT_CODE = `function Widget() {
  const [count, setCount] = React.useState(0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 16 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Mon Widget</h2>
      <div style={{ fontSize: 32, fontWeight: 700, color: '#7c3aed' }}>{count}</div>
      <button
        onClick={() => setCount(c => c + 1)}
        style={{
          background: '#7c3aed', color: '#fff', border: 'none',
          borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontSize: 13,
        }}
      >
        Incrémenter
      </button>
    </div>
  )
}
`
