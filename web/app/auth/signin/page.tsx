"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useAuth } from "../../contexts/AuthContext";
import { useSearchParams } from "next/navigation";
import { FaExclamationCircle, FaEye, FaEyeSlash } from "react-icons/fa";
import Link from "next/link";

// Lazy loading para performance
const ForgotPasswordModal = dynamic(() => import("../modals/forgot-password"), {
  ssr: false,
});

export default function SignIn() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const { login: loginUser, authenticated } = useAuth();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/app/home";

  useEffect(() => {
    if (authenticated && typeof window !== "undefined") {
      window.location.href = redirectUrl;
    }
  }, [authenticated, redirectUrl]);

  if (authenticated) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setStatus("");

    const l = login.trim();
    const p = password;

    if (!l || !p) {
      setErro("Por favor, preencha todos os campos para continuar.");
      return;
    }

    try {
      setSubmitting(true);
      const result = await loginUser({ login: l, password: p });

      if (result.success) {
        setStatus(result.message || "Login realizado com sucesso!");
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 500);
      } else {
        let message = result.message || "Falha no login";
        if (message.includes("Usuário ou senha inválidos")) {
          message = "Usuário/e-mail ou senha incorretos. Verifique seus dados.";
        }
        setErro(message);
      }
    } catch {
      setErro("Não foi possível conectar ao servidor. Verifique sua conexão.");
    } finally {
      setSubmitting(false);
      // Auto-hide das mensagens após 5 segundos
      setTimeout(() => {
        setErro("");
        setStatus("");
      }, 5000);
    }
  };

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-neutral-950 font-sans">
      {/* Background Otimizado (LCP Priority) */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/bg-auth.webp"
          alt="Background visual"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-50"
          quality={80}
        />
        <div className="absolute inset-0 bg-neutral-950/60 backdrop-blur-[2px]"></div>
      </div>

      {/* Botão Sobre */}
      <div className="absolute top-6 right-6 z-50">
        <Link
          href="/about"
          className="flex items-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/20"
        >
          Sobre <FaExclamationCircle />
        </Link>
      </div>

      {/* BLOCO DE MENSAGENS (RESTAURADO) */}
      {(erro || status) && (
        <div className="animate-in slide-in-from-bottom-5 fade-in fixed right-10 bottom-10 z-[60] w-full max-w-md px-4 duration-300">
          {erro && (
            <div className="flex items-center gap-3 rounded-md border border-red-500/50 bg-red-950/80 p-4 text-sm text-red-200 shadow-2xl backdrop-blur-xl">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-500/20">
                <svg
                  className="h-5 w-5 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <span className="font-medium">{erro}</span>
            </div>
          )}
          {status && (
            <div className="flex items-center gap-3 rounded-md border border-green-500/50 bg-green-950/80 p-4 text-sm text-green-200 shadow-2xl backdrop-blur-xl">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-green-500/20">
                <svg
                  className="h-5 w-5 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <span className="font-medium">{status}</span>
            </div>
          )}
        </div>
      )}

      <div className="relative z-10 flex w-full">
        {/* Esquerda: Forms */}
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="w-full max-w-sm space-y-8 rounded-md border border-white/10 bg-neutral-900/50 p-6 shadow-2xl backdrop-blur-2xl">
            <div className="text-center">
              <h1 className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-4xl font-black tracking-tight text-transparent">
                Weave
              </h1>
              <p className="mt-2 text-sm text-gray-400">Gerencie seus projetos e ideias!</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold tracking-wider text-yellow-500">
                  Usuário ou e-mail
                </label>
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-md border border-white/10 bg-black/20 px-4 py-3 text-sm text-white transition-all placeholder:text-gray-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                  placeholder="Seu usuário ou e-mail"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold tracking-wider text-yellow-500">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    className="w-full rounded-md border border-white/10 bg-black/20 px-4 py-3 text-sm text-white transition-all focus:border-yellow-500 focus:outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(true)}
                  className="text-xs font-medium text-gray-400 transition-colors hover:text-yellow-500"
                >
                  Esqueceu a senha?
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-yellow-500 px-8 py-2.5 text-sm font-bold text-black shadow-lg shadow-yellow-500/20 transition-all hover:bg-yellow-400 active:scale-95 disabled:opacity-50"
                >
                  {submitting ? "Entrando..." : "Entrar"}
                </button>
              </div>
            </form>

            <div className="border-t border-white/5 pt-4 text-center">
              <p className="text-sm text-gray-500">
                Não tem uma conta?{" "}
                <Link href="/auth/signup" className="font-bold text-yellow-500 hover:underline">
                  Cadastre-se
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Direita: Marketing */}
        <div className="hidden flex-1 items-center justify-center p-12 lg:flex">
          <div className="max-w-md space-y-6 rounded-md border border-white/10 bg-white/5 p-10 text-center shadow-2xl backdrop-blur-xl transition-transform hover:scale-[1.02]">
            <h2 className="text-3xl font-bold text-white">O que você pode fazer!</h2>
            <p className="text-lg leading-relaxed text-gray-400">
              Criar projetos, organizar tarefas, colaborar com sua equipe e acompanhar o progresso
              em tempo real. Tudo isso em uma plataforma intuitiva e fácil de usar.
            </p>
            <p className="text-lg leading-relaxed text-gray-400">
              Junte-se a nós e transforme a maneira como você gerencia seus projetos!
            </p>
          </div>
        </div>
      </div>

      {showForgotPasswordModal && (
        <ForgotPasswordModal
          isOpen={showForgotPasswordModal}
          onClose={() => setShowForgotPasswordModal(false)}
        />
      )}
    </div>
  );
}
