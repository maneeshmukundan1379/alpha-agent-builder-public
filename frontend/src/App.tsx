import { useEffect, useState } from "react";
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { AuthPanel } from "./components/AuthPanel";
import { BuilderForm } from "./components/BuilderForm";
import { AgentRepositoryPanel } from "./components/AgentRepositoryPanel";
import { AgentRunConsole } from "./components/AgentRunConsole";
import { RequirementsPreview } from "./components/RequirementsPreview";
import { SettingsModal } from "./components/SettingsModal";
import { UserEnvModal } from "./components/UserEnvModal";
import { AgentsWorkspaceProvider } from "./context/AgentsWorkspaceContext";
import {
  fetchAgents,
  fetchMe,
  fetchProviders,
  fetchUserEnv,
  generateAgent,
  getAuthToken,
  login,
  logout,
  previewRequirements,
  saveUserEnv,
  setAuthToken,
  signup,
  updatePassword,
  updateProfile,
} from "./lib/api";
import type {
  AgentConfigRequest,
  AgentMetadata,
  ProviderInfo,
  RequirementsPreviewResponse,
  SettingsPayload,
  UserProfile,
} from "./types";

const defaultConfig: AgentConfigRequest = {
  agent_name: "",
  description: "",
  instructions: "",
  provider_id: "openai",
  model: "gpt-4o-mini",
  frontend_type: "gradio",
  temperature: 0.2,
  extra_requirements: [],
  enabled_tools: [],
  allow_file_uploads: true,
  supported_upload_types: ["txt", "md", "csv", "json", "py", "pdf", "docx"],
  github_repo_url: "",
};

/** New session / login: blank agent name and defaults — do not carry over the last builder draft from memory. */
function freshBuilderConfig(
  providers: ProviderInfo[],
  settings: SettingsPayload | null,
): AgentConfigRequest {
  const next: AgentConfigRequest = {
    ...defaultConfig,
    description: "",
    instructions: "",
  };
  if (providers.length > 0) {
    const p = providers[0];
    next.provider_id = p.id as AgentConfigRequest["provider_id"];
    next.model = p.default_model;
  }
  next.agent_name = "";
  next.enabled_tools = [];
  return next;
}

function AppHeaderBar({
  user,
  onOpenSettings,
  onLogout,
}: {
  user: UserProfile;
  onOpenSettings: () => void;
  onLogout: () => void | Promise<void>;
}) {
  const location = useLocation();
  const onRunPage = location.pathname === "/run";

  return (
    <div className="flex flex-col items-stretch gap-4 md:items-end">
      <div className="flex flex-wrap items-center justify-end gap-3">
        {onRunPage ? (
          <NavLink
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            to="/"
          >
            ← Builder
          </NavLink>
        ) : null}
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
          @{user.username}
        </div>
        <button
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-slate-100 transition hover:bg-white/10"
          onClick={onOpenSettings}
          type="button"
          title="Settings"
        >
          ⚙
        </button>
        <button
          className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          onClick={() => void onLogout()}
          type="button"
        >
          Log out
        </button>
      </div>
    </div>
  );
}

function App() {
  const [config, setConfig] = useState<AgentConfigRequest>(() => freshBuilderConfig([], null));
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [preview, setPreview] = useState<RequirementsPreviewResponse | null>(null);
  const [agents, setAgents] = useState<AgentMetadata[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [banner, setBanner] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userEnvOpen, setUserEnvOpen] = useState(false);
  const [userEnvInitialContent, setUserEnvInitialContent] = useState("");
  /** Bumps when a new authenticated session loads so controlled inputs remount (avoids stray browser autofill). */
  const [builderEpoch, setBuilderEpoch] = useState(0);

  const openUserEnvModal = async () => {
    try {
      const env = await fetchUserEnv();
      setUserEnvInitialContent(env.content);
      setUserEnvOpen(true);
      setBanner(null);
    } catch (error) {
      setBanner({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not load your Env file.",
      });
    }
  };

  const handleSaveUserEnv = async (content: string) => {
    const saved = await saveUserEnv(content);
    setUserEnvInitialContent(saved.content);
    const me = await fetchMe();
    setSettings(me.settings);
    setBanner({
      kind: "success",
      text: "Environment file saved. Reopen Create/Edit Environment file anytime to confirm your keys and GITHUB_TOKEN.",
    });
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        if (!getAuthToken()) {
          return;
        }
        const me = await fetchMe();
        setUser(me.user);
        setSettings(me.settings);

        const [providerList, existingAgents] = await Promise.all([fetchProviders(), fetchAgents()]);
        setProviders(providerList);
        setConfig(freshBuilderConfig(providerList, me.settings));
        setBuilderEpoch((e) => e + 1);

        setAgents(existingAgents);
        setSelectedAgentId("");
      } catch (error) {
        setAuthToken("");
        setBanner({
          kind: "error",
          text: error instanceof Error ? error.message : "Failed to load the application.",
        });
      }
    };

    void initialize();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }
    const syncPreview = async () => {
      try {
        const result = await previewRequirements(config);
        setPreview(result);
      } catch (error) {
        setPreview(null);
        setBanner({
          kind: "error",
          text: error instanceof Error ? error.message : "Failed to preview requirements.",
        });
      }
    };

    void syncPreview();
  }, [config, user]);

  const handleAuthenticated = async (
    token: string,
    nextUser: UserProfile,
    nextSettings: SettingsPayload,
    rememberMe: boolean,
  ) => {
    setAuthToken(token, rememberMe);
    setUser(nextUser);
    setSettings(nextSettings);
    const [providerList, existingAgents] = await Promise.all([fetchProviders(), fetchAgents()]);
    setProviders(providerList);
    setConfig(freshBuilderConfig(providerList, nextSettings));
    setBuilderEpoch((e) => e + 1);
    setAgents(existingAgents);
    setSelectedAgentId("");
  };

  const handleLogin = async (payload: {
    identifier: string;
    password: string;
    rememberMe: boolean;
  }) => {
    try {
      const auth = await login({
        identifier: payload.identifier,
        password: payload.password,
      });
      await handleAuthenticated(auth.token, auth.user, auth.settings, payload.rememberMe);
      setBanner(null);
    } catch (error) {
      setBanner({
        kind: "error",
        text: error instanceof Error ? error.message : "Login failed.",
      });
    }
  };

  const handleSignup = async (payload: {
    name: string;
    username: string;
    email: string;
    password: string;
    rememberMe: boolean;
  }) => {
    try {
      const { rememberMe, ...signupBody } = payload;
      const auth = await signup(signupBody);
      await handleAuthenticated(auth.token, auth.user, auth.settings, rememberMe);
      setBanner(null);
    } catch (error) {
      setBanner({
        kind: "error",
        text: error instanceof Error ? error.message : "Signup failed.",
      });
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setBanner(null);
    try {
      const result = await generateAgent(config);
      const nextAgents = await fetchAgents();
      setAgents(nextAgents);
      setSelectedAgentId(result.agent.agent_id);
      setBanner({ kind: "success", text: result.message });
    } catch (error) {
      setBanner({
        kind: "error",
        text: error instanceof Error ? error.message : "Failed to generate the agent.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveProfile = async (payload: { name: string; username: string; email: string }) => {
    const nextUser = await updateProfile(payload);
    setUser(nextUser);
    setBanner({ kind: "success", text: "Profile updated." });
  };

  const handleSavePassword = async (payload: {
    current_password: string;
    new_password: string;
  }) => {
    await updatePassword(payload);
    setBanner({ kind: "success", text: "Password updated." });
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      /* still clear local session */
    }
    setUser(null);
    setSettings(null);
    setAgents([]);
    setProviders([]);
    setSelectedAgentId("");
    setPreview(null);
    setBanner(null);
    setSettingsOpen(false);
    setAuthToken("");
    setConfig(freshBuilderConfig([], null));
    setBuilderEpoch((e) => e + 1);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_35%),radial-gradient(circle_at_right,rgba(168,85,247,0.16),transparent_25%),linear-gradient(180deg,#020617,#0f172a)] text-white">
        {banner ? (
          <div className="mx-auto max-w-5xl px-6 pt-6 lg:px-8">
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                banner.kind === "success"
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                  : "border-rose-400/20 bg-rose-400/10 text-rose-100"
              }`}
            >
              {banner.text}
            </div>
          </div>
        ) : null}
        <AuthPanel onLogin={handleLogin} onSignup={handleSignup} />
      </div>
    );
  }

  return (
    <AgentsWorkspaceProvider
      agents={agents}
      selectedAgentId={selectedAgentId}
      setAgents={setAgents}
      setSelectedAgentId={setSelectedAgentId}
    >
      <BrowserRouter>
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_35%),radial-gradient(circle_at_right,rgba(168,85,247,0.16),transparent_25%),linear-gradient(180deg,#020617,#0f172a)] text-white">
          <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
            <header className="mb-10 flex flex-col gap-6 border-b border-white/10 pb-8 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  Alpha Agent Builder
                </h1>
                <p className="mt-2 text-sm italic text-slate-400">
                  Build your agent in minutes
                </p>
              </div>
              <AppHeaderBar
                onLogout={handleLogout}
                onOpenSettings={() => setSettingsOpen(true)}
                user={user}
              />
            </header>

            {banner ? (
              <div
                className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
                  banner.kind === "success"
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                    : "border-rose-400/20 bg-rose-400/10 text-rose-100"
                }`}
              >
                {banner.text}
              </div>
            ) : null}

            {settings && !settings.user_env_saved ? (
              <div className="mx-auto max-w-xl rounded-[2rem] border border-cyan-400/20 bg-slate-950/40 px-8 py-10 text-center">
                <h2 className="text-2xl font-semibold text-white">Set up your Environment</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Before you can generate or run agents, save a personal Env file with your API keys (same format as a{" "}
                  <code className="text-cyan-200/90">.env</code> file). After setup, you can change keys anytime with{" "}
                  <strong className="text-slate-200">Create/Edit Environment file</strong> next to Agent name on the
                  builder.
                </p>
                <button
                  className="mt-8 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500 px-8 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:scale-[1.02]"
                  onClick={() => void openUserEnvModal()}
                  type="button"
                >
                  Create your Env file
                </button>
              </div>
            ) : (
              <Routes>
                <Route
                  element={
                    <>
                      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
                        <div className="space-y-6">
                          <BuilderForm
                            key={`builder-${builderEpoch}`}
                            config={config}
                            isGenerating={isGenerating}
                            onChange={setConfig}
                            onGenerate={handleGenerate}
                            onOpenUserEnv={openUserEnvModal}
                            providers={providers}
                          />
                        </div>
                        <RequirementsPreview preview={preview} />
                      </div>
                      <div className="mt-8">
                        <AgentRepositoryPanel onBanner={setBanner} />
                      </div>
                    </>
                  }
                  path="/"
                />
                <Route
                  element={
                    <div>
                      <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 px-6 py-5">
                        <h2 className="text-2xl font-semibold text-white">Run agent</h2>
                        <p className="mt-1 text-sm text-slate-400">
                          Execute the agent (opens a new tab for Gradio/React), attach uploads, and watch logs.
                        </p>
                      </div>
                      <AgentRunConsole onBanner={setBanner} />
                    </div>
                  }
                  path="/run"
                />
                <Route element={<Navigate replace to="/" />} path="*" />
              </Routes>
            )}
          </div>
          <SettingsModal
            onClose={() => setSettingsOpen(false)}
            onLogout={handleLogout}
            onSavePassword={handleSavePassword}
            onSaveProfile={handleSaveProfile}
            open={settingsOpen}
            user={user}
          />
          <UserEnvModal
            initialContent={userEnvInitialContent}
            isFirstSetup={!settings?.user_env_saved}
            onClose={() => setUserEnvOpen(false)}
            onSave={handleSaveUserEnv}
            open={userEnvOpen}
          />
        </div>
      </BrowserRouter>
    </AgentsWorkspaceProvider>
  );
}

export default App;
