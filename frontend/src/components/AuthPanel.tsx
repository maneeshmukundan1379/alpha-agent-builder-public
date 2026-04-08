import { useState } from "react";

interface AuthPanelProps {
  onLogin: (payload: {
    identifier: string;
    password: string;
    rememberMe: boolean;
  }) => Promise<void>;
  onSignup: (payload: {
    name: string;
    username: string;
    email: string;
    password: string;
    rememberMe: boolean;
  }) => Promise<void>;
}

export function AuthPanel({ onLogin, onSignup }: AuthPanelProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [rememberMeLogin, setRememberMeLogin] = useState(false);
  const [rememberMeSignup, setRememberMeSignup] = useState(false);
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 lg:px-8">
      <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/50 backdrop-blur">
        <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-start md:gap-10">
          <div className="flex flex-col justify-start pt-6 md:pr-4">
            <h1 className="text-xl font-semibold uppercase tracking-[0.06em] text-white sm:text-2xl md:text-2xl">
              Alpha Agent Builder
            </h1>
            <p className="mt-3 max-w-md bg-gradient-to-r from-cyan-300 via-violet-300 to-emerald-300 bg-clip-text text-sm italic leading-relaxed text-transparent">
              Build your agent in minutes
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-950/50 p-6">
            <div className="mb-5 flex gap-2 rounded-full bg-white/5 p-1">
              <button
                className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                  mode === "login" ? "bg-cyan-400/90 text-slate-950" : "text-slate-300"
                }`}
                onClick={() => setMode("login")}
                type="button"
              >
                Login
              </button>
              <button
                className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                  mode === "signup" ? "bg-cyan-400/90 text-slate-950" : "text-slate-300"
                }`}
                onClick={() => setMode("signup")}
                type="button"
              >
                Sign Up
              </button>
            </div>

            {mode === "login" ? (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void onLogin({ ...loginForm, rememberMe: rememberMeLogin });
                }}
              >
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, identifier: event.target.value }))
                  }
                  placeholder="Username or email"
                  value={loginForm.identifier}
                />
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Password"
                  type="password"
                  value={loginForm.password}
                />
                <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-300">
                  <input
                    checked={rememberMeLogin}
                    className="h-4 w-4 accent-cyan-400"
                    onChange={(event) => setRememberMeLogin(event.target.checked)}
                    type="checkbox"
                  />
                  <span>Keep me signed in on this device (uses browser storage until you log out)</span>
                </label>
                <button
                  className="w-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:scale-[1.01]"
                  type="submit"
                >
                  Login
                </button>
              </form>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void onSignup({ ...signupForm, rememberMe: rememberMeSignup });
                }}
              >
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
                  onChange={(event) =>
                    setSignupForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Full name"
                  value={signupForm.name}
                />
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
                  onChange={(event) =>
                    setSignupForm((current) => ({ ...current, username: event.target.value }))
                  }
                  placeholder="Username"
                  value={signupForm.username}
                />
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
                  onChange={(event) =>
                    setSignupForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="Email"
                  type="email"
                  value={signupForm.email}
                />
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
                  onChange={(event) =>
                    setSignupForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Password"
                  type="password"
                  value={signupForm.password}
                />
                <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-300">
                  <input
                    checked={rememberMeSignup}
                    className="h-4 w-4 accent-cyan-400"
                    onChange={(event) => setRememberMeSignup(event.target.checked)}
                    type="checkbox"
                  />
                  <span>Keep me signed in on this device (uses browser storage until you log out)</span>
                </label>
                <button
                  className="w-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:scale-[1.01]"
                  type="submit"
                >
                  Create account
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
