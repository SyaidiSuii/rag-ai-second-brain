"use client";

import React, { useState } from "react";

interface LoginPageProps {
  onLoginSuccess: (token: string) => void;
  backendUrl: string;
}

type Feedback = {
  type: "success" | "error" | "info";
  message: string;
};

export default function LoginPage({ onLoginSuccess, backendUrl }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<Feedback | null>(null);

  const getErrorMessage = (err: unknown) => {
    return err instanceof Error ? err.message : "Tindakan gagal. Sila cuba lagi.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFeedback(null);
    setIsSubmitting(true);

    try {
      if (isRegisterMode) {
        const res = await fetch(`${backendUrl}/api/v1/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Pendaftaran gagal.");

        setAuthFeedback({
          type: "success",
          message: "Akaun berjaya didaftarkan! Sila log masuk dengan maklumat anda.",
        });
        setIsRegisterMode(false);
      } else {
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        const res = await fetch(`${backendUrl}/api/v1/auth/login?remember_me=${rememberMe}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "E-mel atau kata laluan tidak sah.");

        if (rememberMe) {
          document.cookie = `token=${data.access_token}; path=/; max-age=2592000; SameSite=Lax`;
          localStorage.setItem("token", data.access_token);
        } else {
          document.cookie = `token=${data.access_token}; path=/; SameSite=Lax`;
          sessionStorage.setItem("token", data.access_token);
        }

        onLoginSuccess(data.access_token);
      }
    } catch (err: unknown) {
      setAuthFeedback({
        type: "error",
        message: getErrorMessage(err),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0a0a0c] text-[#f4f4f5] font-body-lg text-body-lg min-h-screen flex flex-col justify-between selection:bg-zinc-800 antialiased relative z-10 font-sans">
      {/* TopNavBar */}
      <header className="w-full top-0 left-0 bg-[#0a0a0c]/80 backdrop-blur border-b border-[#27272a]">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            {/* Minimal Geometric Monogram */}
            <span className="font-headline-sm text-headline-sm font-medium tracking-tight text-[#f4f4f5]">
              AI Second Brain
            </span>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2 border-[#27272a]">
              {/* Toggle Theme button with Sun icon */}
              <button
                aria-label="Toggle Theme"
                className="p-1.5 text-[#a1a1aa] hover:text-white transition-colors duration-150 rounded-sm cursor-pointer flex items-center justify-center"
                type="button"
              >
                <svg
                  className="w-[18px] h-[18px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              </button>

              {/* Support Help button with Question Circle icon */}
              <button
                aria-label="Support Help"
                className="p-1.5 text-[#a1a1aa] hover:text-white transition-colors duration-150 rounded-sm cursor-pointer flex items-center justify-center"
                type="button"
              >
                <svg
                  className="w-[18px] h-[18px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Centered Distraction-Free Canvas */}
      <main className="flex-1 flex items-center justify-center px-5 py-space-xl">
        <div className="w-full max-w-[380px] bg-[#121215] border border-[#27272a] rounded-xl p-8 shadow-2xl shadow-black/60 transition-all">
          {/* Headline & Subheader */}
          <div className="mb-space-lg text-center">
            <h1 className="font-headline-lg text-headline-lg text-[#f4f4f5] tracking-tight">
              {isRegisterMode ? "Create an account" : "Welcome back"}
            </h1>
            <p className="font-body-sm text-body-sm text-[#a1a1aa] mt-1">
              {isRegisterMode
                ? "Enter your credentials to get started with your workspace"
                : "Enter your credentials to access your workspace"}
            </p>
          </div>

          {/* Social SSO Authentication Controls */}
          <div className="grid gap-2.5 mb-space-lg grid-cols-2">
            {/* Google SSO */}
            <button
              className="h-[44px] flex items-center justify-center bg-[#18181b] border border-[#27272a] rounded-lg hover:bg-[#202024] hover:border-[#3f3f46] transition-colors duration-150 active:scale-[0.99] cursor-pointer"
              title="Sign in with Google"
              type="button"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
            </button>
            {/* GitHub SSO */}
            <button
              className="h-[44px] flex items-center justify-center bg-[#18181b] border border-[#27272a] rounded-lg hover:bg-[#202024] hover:border-[#3f3f46] transition-colors duration-150 active:scale-[0.99] cursor-pointer"
              title="Sign in with GitHub"
              type="button"
            >
              <svg className="w-4 h-4 fill-[#f4f4f5]" viewBox="0 0 24 24">
                <path
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  fillRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-space-lg flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#27272a]" />
            </div>
            <span className="relative px-3 bg-[#121215] font-label-sm text-label-sm text-[#71717a] tracking-wider uppercase">
              or continue with email
            </span>
          </div>

          {/* Feedback alerts */}
          {authFeedback && (
            <div
              className={`mb-4 p-3 rounded-lg text-xs leading-relaxed border flex items-start gap-2 ${
                authFeedback.type === "success"
                  ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                  : authFeedback.type === "error"
                  ? "bg-red-950/40 border-red-800/60 text-red-300"
                  : "bg-zinc-900 border-zinc-700 text-zinc-300"
              }`}
              role="status"
            >
              <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">
                {authFeedback.type === "success"
                  ? "check_circle"
                  : authFeedback.type === "error"
                  ? "error"
                  : "info"}
              </span>
              <span className="flex-1">{authFeedback.message}</span>
            </div>
          )}

          {/* Credential Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Email Input */}
            <div className="space-y-1.5">
              <label
                className="block font-label-md text-label-md text-[#f4f4f5] font-medium"
                htmlFor="email"
              >
                Work email
              </label>
              <input
                className="w-full h-[44px] px-3.5 bg-[#18181b] border border-[#27272a] rounded-lg font-body-lg text-body-lg text-[#f4f4f5] placeholder:text-[#71717a] hover:border-[#3f3f46] focus:border-white focus:ring-1 focus:ring-white focus:outline-none transition-colors duration-150"
                id="email"
                placeholder="name@company.com"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label
                className="block font-label-md text-label-md text-[#f4f4f5] font-medium"
                htmlFor="password"
              >
                Password
              </label>
              <div className="relative">
                <input
                  className="w-full h-[44px] pl-3.5 pr-10 bg-[#18181b] border border-[#27272a] rounded-lg font-body-lg text-body-lg text-[#f4f4f5] placeholder:text-[#71717a] hover:border-[#3f3f46] focus:border-white focus:ring-1 focus:ring-white focus:outline-none transition-colors duration-150"
                  id="password"
                  placeholder="••••••••••••"
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {/* Password visibility toggle button with Eye SVG */}
                <button
                  aria-label="Toggle password visibility"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#a1a1aa] hover:text-[#f4f4f5] transition-colors duration-150 cursor-pointer"
                  id="toggle-password"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg
                      className="w-[18px] h-[18px]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      className="w-[18px] h-[18px]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  className="w-4 h-4 rounded-[3px] bg-[#18181b] border-[#3f3f46] text-white focus:ring-0 focus:ring-offset-0 focus:ring-offset-transparent transition-colors accent-zinc-200"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="font-body-sm text-body-sm text-[#a1a1aa]">
                  Remember for 30 days
                </span>
              </label>
              {!isRegisterMode && (
                <a
                  className="font-body-sm text-body-sm text-[#a1a1aa] hover:text-[#f4f4f5] hover:underline transition-colors duration-150"
                  href="#forgot"
                >
                  Forgot password?
                </a>
              )}
            </div>

            {/* Primary CTA */}
            <button
              className="w-full h-[44px] mt-2 bg-white text-[#0a0a0c] rounded-lg font-label-md text-label-md font-medium hover:bg-[#e4e4e7] active:scale-[0.99] transition-all duration-150 flex items-center justify-center shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Processing..."
                : isRegisterMode
                ? "Create account"
                : "Sign in"}
            </button>
          </form>

          {/* Switch Register/Login Mode */}
          <div className="mt-5 text-center pt-2">
            <p className="font-body-sm text-body-sm text-[#a1a1aa]">
              {isRegisterMode ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setAuthFeedback(null);
                }}
                className="text-white hover:underline font-medium ml-1 cursor-pointer"
              >
                {isRegisterMode ? "Sign in" : "Sign up"}
              </button>
            </p>
          </div>
        </div>
      </main>

      {/* Footer from Shared Components JSON - Empty as in original design */}
      <div className="py-4" />
    </div>
  );
}
