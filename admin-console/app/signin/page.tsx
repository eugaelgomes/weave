"use client";

import { useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import { login as apiLogin } from "@/app/services/api";
import { FaEnvelope, FaLock, FaSpinner, FaEye, FaEyeSlash } from "react-icons/fa";
import { HiSparkles, HiExclamationCircle, HiArrowRight } from "react-icons/hi2";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await apiLogin(email, password);
      if (response && response.admin) {
        login(response.admin);
      } else {
        setError("Resposta inválida do servidor. Verifique suas permissões.");
      }
    } catch (err: any) {
      setError(err.message || "Credenciais inválidas. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 font-sans">

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">

        {/* Header */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary-500">
            <HiSparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">Weave Console</h1>
            <p className="mt-0.5 text-sm text-neutral-400">Acesso administrativo</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">

          {/* Email */}
          <div className="group relative">
            <label htmlFor="email" className="sr-only">E-mail</label>
            <FaEnvelope className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-300 transition-colors group-focus-within:text-brand-primary-500" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pl-9 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition-all focus:border-yellow-500 focus:bg-white focus:ring-3 focus:ring-yellow-500/10"
            />
          </div>

          {/* Password */}
          <div className="group relative">
            <label htmlFor="password" className="sr-only">Senha</label>
            <FaLock className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-300 transition-colors group-focus-within:text-brand-primary-500" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pl-9 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition-all focus:border-yellow-500 focus:bg-white focus:ring-3 focus:ring-yellow-500/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-300 transition-colors hover:text-brand-primary-500"
            >
              {showPassword ? <FaEyeSlash className="h-3.5 w-3.5" /> : <FaEye className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Forgot password */}
          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs text-neutral-400 transition-colors hover:text-brand-primary-500"
            >
              Esqueceu a senha?
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-500">
              <HiExclamationCircle className="mt-px h-3.5 w-3.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="group mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary-500 py-2.5 text-sm font-semibold text-white transition-all hover:bg-yellow-400 focus:outline-none focus:ring-3 focus:ring-yellow-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <FaSpinner className="h-3.5 w-3.5 animate-spin" />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <span>Entrar</span>
                <HiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>

        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-neutral-300">
          Acesso restrito a administradores
        </p>

      </div>
    </div>
  );
}
