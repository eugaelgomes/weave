"use client";

import { useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import { login as apiLogin } from "@/app/services/api";
import { FaEnvelope, FaLock, FaSpinner } from "react-icons/fa";
import { HiSparkles, HiExclamationCircle } from "react-icons/hi2";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await apiLogin(email, password);
      // A resposta deve conter o objeto admin
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-50 px-4 font-sans dark:bg-neutral-950">
      
      {/* Padrão de Fundo - Consistência visual com o restante do SaaS */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] dark:bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)]" />
      <div className="absolute left-1/2 top-1/2 -z-10 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400 opacity-20 blur-[120px] dark:bg-yellow-500/10" />

      {/* Card de Login (Glassmorphism leve) */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-neutral-200 bg-white/70 p-8 shadow-xl backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/70">
        
        {/* Cabeçalho */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-yellow-200 bg-yellow-100/50 text-yellow-600 shadow-sm dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-500">
            <HiSparkles className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Weave Console
          </h2>
          <p className="mt-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">
            Acesso administrativo seguro
          </p>
        </div>

        {/* Formulário */}
        <form className="space-y-5" onSubmit={handleSubmit}>
          
          <div className="space-y-4">
            {/* Input E-mail */}
            <div>
              <label htmlFor="email-address" className="sr-only">E-mail</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400 focus-within:text-yellow-500">
                  <FaEnvelope className="h-4 w-4" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="Seu e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-neutral-300 bg-white/50 py-2.5 pl-10 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-yellow-500 dark:focus:ring-yellow-500 transition-colors"
                />
              </div>
            </div>

            {/* Input Senha */}
            <div>
              <label htmlFor="password" className="sr-only">Senha</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400 focus-within:text-yellow-500">
                  <FaLock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-neutral-300 bg-white/50 py-2.5 pl-10 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-yellow-500 dark:focus:ring-yellow-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Feedback de Erro Aprimorado */}
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400">
              <HiExclamationCircle className="h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Botão de Ação */}
          <button
            type="submit"
            disabled={loading}
            className="group flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-bold text-neutral-950 transition-all hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-neutral-50 disabled:opacity-70 dark:focus:ring-offset-neutral-950"
          >
            {loading ? (
              <>
                <FaSpinner className="h-4 w-4 animate-spin" />
                <span>Autenticando...</span>
              </>
            ) : (
              "Entrar no Console"
            )}
          </button>

        </form>
      </div>
    </div>
  );
}