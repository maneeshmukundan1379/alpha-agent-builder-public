import { useEffect, useRef, useState } from "react";

import { agentEditChat } from "../lib/api";
import type { AgentEditChatMessage, FrontendType } from "../types";

interface AgentEditChatModalProps {
  open: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
  /** Used to show which paths the edit agent can touch */
  frontendType?: FrontendType;
  onEdited: (updatedFiles: string[]) => void;
}

export function AgentEditChatModal({
  open,
  onClose,
  agentId,
  agentName,
  frontendType,
  onEdited,
}: AgentEditChatModalProps) {
  const [messages, setMessages] = useState<AgentEditChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMessages([]);
      setDraft("");
      setError(null);
      setBusy(false);
    }
  }, [open, agentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  if (!open) {
    return null;
  }

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) {
      return;
    }
    const nextThread: AgentEditChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextThread);
    setDraft("");
    setBusy(true);
    setError(null);
    try {
      const result = await agentEditChat(agentId, nextThread, {
        include_static_diagnostics: true,
        runtime_error: "",
      });
      setMessages((m) => [...m, { role: "assistant", content: result.assistant_message }]);
      if (result.updated_files.length > 0) {
        onEdited(result.updated_files);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed.";
      setError(msg);
      setMessages((m) => m.slice(0, -1));
      setDraft(text);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur-sm sm:items-center"
      onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
      onKeyDown={(e) => e.key === "Escape" && !busy && onClose()}
      role="dialog"
    >
      <div className="flex max-h-[min(720px,92vh)] w-full max-w-5xl flex-col overflow-hidden rounded-[1.75rem] border border-white/15 bg-slate-900 shadow-2xl shadow-cyan-950/40">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-cyan-300/90">Edit / fix agent</div>
            <h2 className="mt-1 text-lg font-semibold text-white">{agentName}</h2>
            <p className="mt-1 text-xs text-slate-400">
              One box below: describe code changes, ask how to fix an issue, or paste tracebacks / logs. Uses your Env file
              keys. Editable paths include <code className="text-slate-300">logic.py</code>,{" "}
              <code className="text-slate-300">app.py</code>, <code className="text-slate-300">main.py</code>,{" "}
              <code className="text-slate-300">run_agent.py</code>, <code className="text-slate-300">requirements.txt</code>
              {frontendType === "react" ? (
                <>
                  , and <code className="text-slate-300">react-ui/</code> (e.g. <code className="text-slate-300">App.tsx</code>
                  ).
                </>
              ) : null}
              . Static checks run automatically each send. The running agent is stopped before each turn.
            </p>
          </div>
          <button
            className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-40"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {messages.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-400">
                {frontendType === "react" ? (
                  <>
                    Examples in the same field: feature tweaks (“Change the header and button color in the React UI”), fixes
                    (“ImportError when starting—see traceback below” + paste), or logs from the browser terminal.
                  </>
                ) : (
                  <>
                    Examples: “Add a tone textbox and wire it in <code className="text-slate-300">logic.py</code>,” or paste
                    a full stderr/traceback and ask what to fix.
                  </>
                )}
              </div>
            ) : null}
            {messages.map((m, i) => (
              <div
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                key={`${m.role}-${i}-${m.content.slice(0, 12)}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-cyan-500/20 text-cyan-50"
                      : "border border-white/10 bg-slate-950/70 text-slate-100"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {error ? (
              <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-white/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <textarea
              className="min-h-[min(200px,28vh)] flex-1 resize-y rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none disabled:opacity-50"
              disabled={busy}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Changes: what to build or edit. Fixes: what broke and how to reproduce. Errors: paste full traceback or logs here too. Enter = send, Shift+Enter = newline."
              value={draft}
            />
            <button
              className="shrink-0 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy || !draft.trim()}
              onClick={() => void send()}
              type="button"
            >
              {busy ? "Working…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
