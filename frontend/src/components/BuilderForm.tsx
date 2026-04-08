import type { ChangeEvent } from "react";

import type { AgentConfigRequest, ProviderInfo } from "../types";

interface BuilderFormProps {
  config: AgentConfigRequest;
  providers: ProviderInfo[];
  isGenerating: boolean;
  onChange: (nextConfig: AgentConfigRequest) => void;
  onGenerate: () => void;
  onOpenUserEnv: () => void | Promise<void>;
}

const FRONTEND_OPTIONS = [
  {
    id: "cli",
    label: "CLI",
    description: "Terminal-based interactive agent.",
  },
  {
    id: "gradio",
    label: "Gradio",
    description: "Web UI — quick to run, no Node.js.",
  },
  {
    id: "react",
    label: "React",
    description: "Vite + React chat UI with a FastAPI backend (needs Node.js for dev).",
  },
] as const;

export function BuilderForm({
  config,
  providers,
  isGenerating,
  onChange,
  onGenerate,
  onOpenUserEnv,
}: BuilderFormProps) {
  const selectedProvider =
    providers.find((provider) => provider.id === config.provider_id) ?? providers[0];

  const update = <K extends keyof AgentConfigRequest>(key: K, value: AgentConfigRequest[K]) => {
    onChange({ ...config, [key]: value, enabled_tools: [] });
  };

  const updateConfig = (nextFields: Partial<AgentConfigRequest>) => {
    onChange({ ...config, ...nextFields, enabled_tools: [] });
  };

  const updateText =
    (key: "agent_name") =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      update(key, event.target.value);
    };

  const updateAgentPurpose = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    onChange({ ...config, description: value, instructions: value, enabled_tools: [] });
  };

  const agentPurpose = config.instructions || config.description;

  return (
    <div className="space-y-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/40">
      <div className="rounded-2xl border border-white/15 bg-slate-950/35 p-5 shadow-inner shadow-slate-950/20">
        <div className="mb-2 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
          Agent Blueprint
        </div>
        <h2 className="text-2xl font-semibold text-white">Build your agent in minutes</h2>
        <h3 className="mt-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Instructions</h3>
        <ol className="mt-2 max-w-3xl list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-300 marker:text-cyan-300/90">
          <li>
            <span className="font-medium text-slate-200">Set up your Env file.</span> Use the{" "}
            <strong className="font-medium text-slate-200">Create/Edit Environment file</strong> button next to Agent
            name to
            add your secret keys, add lines like <code className="text-cyan-200/90">OPENAI_API_KEY=...</code>. This file is
            reused for every agent
            and when you Run. For Git check-in, put <code className="text-cyan-200/90">GITHUB_TOKEN</code> in the Env file
            too.
          </li>
          <li>
            <span className="font-medium text-slate-200">Name the agent.</span> Enter an agent name with at least three
            characters.
          </li>
          <li>
            <span className="font-medium text-slate-200">Describe the behavior.</span> In{" "}
            <strong className="font-medium text-slate-200">What should the agent do?</strong>, write clear step-by-step
            instructions: goals, inputs, how to answer, output shape, and what to do when information is missing.
          </li>
          <li>
            <span className="font-medium text-slate-200">Choose model and interface.</span> Pick{" "}
            <strong className="font-medium text-slate-200">LLM model</strong> (OpenAI or Gemini), the specific model to
            use, and the generated frontend (Gradio, React, or CLI).
          </li>
          <li>
            <span className="font-medium text-slate-200">Generate the project.</span> Click{" "}
            <strong className="font-medium text-slate-200">Generate Agent</strong> and wait for the success notice; code
            is written under your user&apos;s <strong className="font-medium text-slate-200">generated_agents</strong>{" "}
            directory.
          </li>
          <li>
            <span className="font-medium text-slate-200">Run it.</span> In{" "}
            <strong className="font-medium text-slate-200">Repository</strong>, pick your agent, then click{" "}
            <strong className="font-medium text-slate-200">Run agent</strong>. Gradio and React UIs open in the panel (or
            a new tab). CLI agents switch to the <strong className="font-medium text-slate-200">Run agent</strong> page for
            prompts, uploads, and logs.
          </li>
          <li>
            Use <strong className="font-medium text-slate-200">Edit/fix agent</strong>, refresh the file tree, or{" "}
            <strong className="font-medium text-slate-200">Check in to Git</strong> from{" "}
            <strong className="font-medium text-slate-200">Repository</strong> when you are ready.
          </li>
        </ol>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="min-w-0 flex-1 space-y-2">
            <span className="text-sm font-medium text-slate-200">Agent name</span>
            <input
              autoComplete="off"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
              name="alpha-builder-agent-name"
              onChange={updateText("agent_name")}
              placeholder="Customer Insight Agent"
              type="text"
              value={config.agent_name}
            />
          </label>
          <button
            className="inline-flex w-full shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 px-5 py-3.5 text-center text-sm font-semibold leading-snug text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:brightness-105 disabled:opacity-60 lg:w-auto lg:max-w-xs"
            onClick={() => void onOpenUserEnv()}
            type="button"
          >
            Create/Edit Environment file
          </button>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">LLM model</span>
          <select
            className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
            onChange={(event) => {
              const provider = providers.find((item) => item.id === event.target.value);
              updateConfig({
                provider_id: event.target.value as AgentConfigRequest["provider_id"],
                model: provider?.default_model ?? config.model,
              });
            }}
            value={config.provider_id}
          >
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-200">What should the agent do?</span>
        <p className="text-xs leading-5 text-slate-400">
          Give <strong className="font-medium text-slate-300">clear step-by-step instructions</strong>: what the agent is
          for, how it should behave, how to structure answers, and how to handle edge cases or missing information.
        </p>
        <textarea
          className="min-h-[200px] w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
          onChange={updateAgentPurpose}
          value={agentPurpose}
        />
      </label>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-200">Model</span>
        <select
          className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
          onChange={(event) => update("model", event.target.value)}
          value={config.model}
        >
          {selectedProvider?.models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-400">{selectedProvider?.description}</p>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-200">Generated frontend</span>
          <select
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
            onChange={(event) =>
              update("frontend_type", event.target.value as AgentConfigRequest["frontend_type"])
            }
            value={config.frontend_type}
          >
            {FRONTEND_OPTIONS.map((frontend) => (
              <option key={frontend.id} value={frontend.id}>
                {frontend.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400">
            {FRONTEND_OPTIONS.find((frontend) => frontend.id === config.frontend_type)?.description}
          </p>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-200">Temperature</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
            max={2}
            min={0}
            onChange={(event) => update("temperature", Number(event.target.value))}
            step={0.1}
            type="number"
            value={config.temperature}
          />
        </label>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
        <label className="flex items-center gap-3">
          <input
            checked={config.allow_file_uploads}
            className="h-4 w-4 accent-cyan-400"
            onChange={(event) => update("allow_file_uploads", event.target.checked)}
            type="checkbox"
          />
          <span className="text-sm font-medium text-slate-200">
            Enable file upload support in the generated agent
          </span>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-200">Supported upload types</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!config.allow_file_uploads}
            onChange={(event) =>
              update(
                "supported_upload_types",
                event.target.value
                  .split(",")
                  .map((item) => item.trim().replace(/^\./, "").toLowerCase())
                  .filter(Boolean),
              )
            }
            placeholder="txt, md, csv, json, py"
            value={config.supported_upload_types.join(", ")}
          />
          <p className="text-xs text-slate-400">
            These file types can be uploaded through the generated agent and the builder runner.
          </p>
        </label>
      </div>

      <div>
        <button
          className="rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isGenerating}
          onClick={onGenerate}
          type="button"
        >
          {isGenerating ? "Generating..." : "Generate Agent"}
        </button>
      </div>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-200">Additional requirements</span>
        <input
          className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
          onChange={(event) =>
            update(
              "extra_requirements",
              event.target.value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            )
          }
          placeholder="Example: pandas, numpy"
          value={config.extra_requirements.join(", ")}
        />
        <p className="text-xs text-slate-400">
          Add any extra packages you want included in the generated `requirements.txt`.
        </p>
      </label>
    </div>
  );
}
