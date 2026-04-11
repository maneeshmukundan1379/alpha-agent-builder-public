import { useEffect, useState } from "react";

import type { UserEnvVariableStatus } from "../types";

export const DEFAULT_USER_ENV_TEMPLATE = `# One line per variable (UPPER_SNAKE_CASE).
# Saved values stay on the server and are not shown in the browser again after save.

OPENAI_API_KEY=

GEMINI_API_KEY=

GOOGLE_API_KEY=

GITHUB_TOKEN=
`;

const DEFAULT_USER_ENV_PATCH_TEMPLATE = `# Add only the keys you want to add or replace.
# Omitted keys stay unchanged on the server.
# To clear a saved key, set it to an empty value, for example:
# OPENAI_API_KEY=
`;

interface UserEnvModalProps {
  open: boolean;
  initialContent: string;
  variables: UserEnvVariableStatus[];
  isFirstSetup: boolean;
  onClose: () => void;
  onSave: (content: string) => Promise<void>;
}

export function UserEnvModal({
  open,
  initialContent,
  variables,
  isFirstSetup,
  onClose,
  onSave,
}: UserEnvModalProps) {
  const [text, setText] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const fallbackTemplate = isFirstSetup ? DEFAULT_USER_ENV_TEMPLATE : DEFAULT_USER_ENV_PATCH_TEMPLATE;
    setText(initialContent.trim() ? initialContent : fallbackTemplate);
    setError(null);
  }, [open, initialContent, isFirstSetup]);

  if (!open) {
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(text);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-[1.5rem] border border-white/10 bg-slate-950 shadow-2xl">
        <div className="border-b border-white/10 px-6 py-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/90">
            Environment file
          </div>
          <h2 className="text-xl font-semibold text-white">
            {isFirstSetup ? "Create your Env file" : "Update your Env file"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Same format as a <code className="text-cyan-200/80">.env</code> file. Saved values stay server-side only. Add
            only the keys you want to create or replace; omitted keys stay unchanged. Generated agents receive these values
            only when you <strong className="text-slate-200">Run</strong>. Add{" "}
            <code className="text-cyan-200/80">GITHUB_TOKEN=</code> so &quot;Check in to GitHub&quot; in Repository can
            authenticate. To clear a saved key later, enter it with an empty value.
          </p>
        </div>
        <div className="min-h-0 flex-1 px-6 py-4">
          {variables.length > 0 ? (
            <div className="mb-4 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/90">
                Currently saved on the server
              </div>
              <div className="mt-3 space-y-2">
                {variables.map((variable) => (
                  <div
                    className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-sm"
                    key={variable.key}
                  >
                    <code className="text-slate-200">{variable.key}</code>
                    <code className="text-slate-400">{variable.masked_value}</code>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <textarea
            autoComplete="off"
            className="h-[min(50vh,420px)] w-full resize-y rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 font-mono text-sm leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/40 focus:outline-none focus:ring-1 focus:ring-cyan-400/30"
            onChange={(e) => setText(e.target.value)}
            placeholder={isFirstSetup ? DEFAULT_USER_ENV_TEMPLATE : DEFAULT_USER_ENV_PATCH_TEMPLATE}
            spellCheck={false}
            value={text}
          />
          {error ? (
            <p className="mt-2 text-sm text-rose-300" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
          <button
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-full bg-gradient-to-r from-cyan-400 to-sky-500 px-5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            disabled={saving}
            onClick={() => void handleSave()}
            type="button"
          >
            {saving ? "Saving…" : "Save Env file"}
          </button>
        </div>
      </div>
    </div>
  );
}
