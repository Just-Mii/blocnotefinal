"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Widget } from "@/types";

// Strip ES module syntax so Widget() becomes a plain global function in the iframe
function sanitizeCode(raw: string): string {
  return raw
    .replace(/export\s+default\s+function\s+/g, "function ")
    .replace(/^\s*export\s+default\s+\w+\s*;?\s*$/gm, "");
}

interface WidgetRendererProps {
  widget: Widget;
  /** Called when the widget invokes WidgetAPI.notify() */
  onNotify?: (message: string, type: string) => void;
  className?: string;
}

// ─── iframe HTML generator ────────────────────────────────────────────────────

function buildIframeHtml(
  code: string,
  initialStorage: Record<string, unknown>,
): string {
  const safe = sanitizeCode(code);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js" crossorigin></script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:Inter,system-ui,sans-serif;color:#e2e8f0;background:#1e1e2e;padding:8px;font-size:14px;line-height:1.5;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:4px;}
</style>
</head>
<body>
<div id="root"></div>
<script>
window.__wStorage__=${JSON.stringify(initialStorage)};

window.WidgetAPI={
  storage:{
    get:function(key){
      return new Promise(function(resolve){
        var id=Math.random().toString(36).slice(2);
        parent.postMessage({type:'storage.get',key:key,id:id},'*');
        function h(e){
          if(e.data&&e.data.type==='storage.response'&&e.data.id===id){
            window.removeEventListener('message',h);
            resolve(e.data.value);
          }
        }
        window.addEventListener('message',h);
      });
    },
    getSync:function(key){return window.__wStorage__[key];},
    set:function(key,val){
      window.__wStorage__[key]=val;
      parent.postMessage({type:'storage.set',key:key,val:val},'*');
      return Promise.resolve();
    },
  },
  fetch:function(url,opts){
    return new Promise(function(resolve,reject){
      var id=Math.random().toString(36).slice(2);
      parent.postMessage({type:'fetch',url:url,opts:opts||{},id:id},'*');
      function h(e){
        if(e.data&&e.data.type==='fetch.response'&&e.data.id===id){
          window.removeEventListener('message',h);
          if(e.data.error){reject(new Error(e.data.error));}
          else{resolve({ok:true,json:function(){return Promise.resolve(e.data.data);},text:function(){return Promise.resolve(JSON.stringify(e.data.data));},data:e.data.data});}
        }
      }
      window.addEventListener('message',h);
    });
  },
  theme:{mode:'dark',accent:'#7c3aed'},
  notify:function(msg,type){parent.postMessage({type:'notify',msg:msg,notifyType:type||'info'},'*');},
};
</script>
<script type="text/babel" data-presets="react">
${safe}

try{
  const root=ReactDOM.createRoot(document.getElementById('root'));
  root.render(React.createElement(Widget));
}catch(e){
  document.getElementById('root').innerHTML='<div style="color:#f87171;padding:8px;font-size:12px;">&#9888; '+e.message+'</div>';
}
</script>
</body>
</html>`;
}

// ─── WidgetRenderer ───────────────────────────────────────────────────────────

export function WidgetRenderer({
  widget,
  onNotify,
  className,
}: WidgetRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Mutable storage ref so storage.set updates are reflected in storage.get
  const storageRef = useRef<Record<string, unknown>>({ ...widget.storage });

  // Keep storageRef in sync when widget prop changes (e.g., after a save)
  useEffect(() => {
    storageRef.current = { ...widget.storage };
  }, [widget.storage]);

  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      const iframe = iframeRef.current;
      if (!iframe || !event.data || typeof event.data !== "object") return;
      // Only handle messages from our iframe
      if (event.source !== iframe.contentWindow) return;

      const { type, key, val, url, opts, id, msg, notifyType } = event.data as {
        type: string;
        key?: string;
        val?: unknown;
        url?: string;
        opts?: RequestInit;
        id?: string;
        msg?: string;
        notifyType?: string;
      };

      switch (type) {
        case "storage.get": {
          const value = storageRef.current[key ?? ""];
          iframe.contentWindow?.postMessage(
            { type: "storage.response", key, id, value },
            "*",
          );
          break;
        }

        case "storage.set": {
          if (key) {
            storageRef.current = { ...storageRef.current, [key]: val };
            // Persist to DB in the background – fire and forget
            fetch(`/api/widgets/${widget.id}/storage`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key, val }),
            }).catch(() => {});
          }
          break;
        }

        case "fetch": {
          try {
            const res = await fetch("/api/widget-proxy", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ widgetId: widget.id, url, options: opts }),
            });
            const data = res.ok ? await res.json() : null;
            const errorMsg = res.ok ? undefined : `HTTP ${res.status}`;
            iframe.contentWindow?.postMessage(
              { type: "fetch.response", id, data, error: errorMsg },
              "*",
            );
          } catch (err) {
            iframe.contentWindow?.postMessage(
              { type: "fetch.response", id, data: null, error: String(err) },
              "*",
            );
          }
          break;
        }

        case "notify": {
          onNotify?.(msg ?? "", notifyType ?? "info");
          break;
        }
      }
    },
    [widget.id, onNotify],
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={buildIframeHtml(widget.code, storageRef.current)}
      sandbox="allow-scripts allow-same-origin"
      className={className}
      title={widget.name}
      style={{
        border: "none",
        width: "100%",
        height: "100%",
        display: "block",
      }}
    />
  );
}
