"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Globe, Lock, Monitor, Smartphone, Store, Tablet } from "lucide-react";

interface BrowserPreviewProps {
  previewUrl?: string;
  isLoading: boolean;
  summary?: string;
  checks?: string[];
  errorMessage?: string | null;
}

export function BrowserPreview({ previewUrl, isLoading, summary, checks, errorMessage }: BrowserPreviewProps) {
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);
  const width = device === "mobile" ? "max-w-[390px]" : device === "tablet" ? "max-w-[768px]" : "w-full";

  async function copyPreview() {
    if (!previewUrl) return;
    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { /* Clipboard access may be unavailable in an insecure local context. */ }
  }

  return (
    <section className="flex min-h-[34rem] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm lg:h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
        <div className="flex w-16 items-center gap-1.5" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-slate-300" />
          <span className="h-3 w-3 rounded-full bg-slate-300" />
          <span className="h-3 w-3 rounded-full bg-slate-300" />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
          <div className="flex min-w-0 items-center gap-2">
            {previewUrl ? <Lock className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> : <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
            <span className="truncate font-mono">{previewUrl ?? "Your verified Sandbox preview will appear here"}</span>
          </div>
          {previewUrl && (
            <div className="ml-2 flex shrink-0 items-center gap-1">
              <button type="button" onClick={copyPreview} aria-label="Copy preview link" className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" aria-label="Open live storefront in a new tab" className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-slate-200/60 p-0.5" aria-label="Preview viewport size">
          <button type="button" onClick={() => setDevice("desktop")} aria-label="Desktop viewport" aria-pressed={device === "desktop"} className={`rounded-md p-1.5 ${device === "desktop" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}><Monitor className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={() => setDevice("tablet")} aria-label="Tablet viewport" aria-pressed={device === "tablet"} className={`rounded-md p-1.5 ${device === "tablet" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}><Tablet className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={() => setDevice("mobile")} aria-label="Mobile viewport" aria-pressed={device === "mobile"} className={`rounded-md p-1.5 ${device === "mobile" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}><Smartphone className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-100/70 p-4">
        {isLoading ? (
          <div className="max-w-sm p-8 text-center" role="status" aria-live="polite">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600"><span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" /></div>
            <h2 className="text-sm font-semibold text-slate-800">Building in CreateOS Sandbox</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">Claude is writing the storefront. Kams will run it in a real Sandbox and check the preview before showing a link.</p>
          </div>
        ) : previewUrl ? (
          <div className={`flex h-full min-h-[28rem] ${width} flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md`}>
            <iframe src={previewUrl} title="Verified Kams storefront preview" referrerPolicy="no-referrer" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" className="h-full min-h-[28rem] w-full border-0 bg-white" />
          </div>
        ) : (
          <div className="max-w-md p-8 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm"><Store className="h-7 w-7" /></div>
            <h2 className="text-sm font-semibold tracking-tight text-slate-800">Your storefront preview</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">Describe your business, then Kams will generate the page, run it in CreateOS Sandbox, and verify the live preview.</p>
          </div>
        )}
      </div>

      {(errorMessage || summary || checks?.length) && (
        <div className="space-y-2 border-t border-slate-200 bg-white p-4">
          {errorMessage && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>}
          {summary && <p className="text-sm leading-relaxed text-slate-700">{summary}</p>}
          {checks?.length ? <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-emerald-700">{checks.map((check) => <li key={check} className="flex items-center gap-1"><Check className="h-3.5 w-3.5" />{check}</li>)}</ul> : null}
        </div>
      )}
    </section>
  );
}
