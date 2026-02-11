"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useAuth } from "../../contexts/AuthContext";
import { useSearchParams, useRouter } from "next/navigation";
import { FaEye, FaEyeSlash, FaGithub, FaLinkedin } from "react-icons/fa";
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
  const hasRedirected = useRef(false);

  const { login: loginUser, authenticated, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  // Normaliza a URL removendo barras finais para evitar loops de redirecionamento
  const redirectUrl = redirectParam
    ? redirectParam.replace(/\/+$/, "") || "/app/home"
    : "/app/home";

  useEffect(() => {
    if (!loading && authenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(redirectUrl);
    }
  }, [authenticated, loading, redirectUrl, router]);

  // Aguarda verificação de autenticação ou redirecionamento
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50 transition-colors dark:bg-neutral-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-800 border-t-transparent dark:border-white"></div>
      </div>
    );
  }

  // Se autenticado, mostra loading enquanto redireciona
  if (authenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50 transition-colors dark:bg-neutral-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-800 border-t-transparent dark:border-white"></div>
      </div>
    );
  }

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
        // Estado já foi atualizado, deixa o useEffect fazer o redirect
        // ou redireciona manualmente
        router.push(redirectUrl);
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
    <div className="relative flex h-screen w-full flex-col justify-between overflow-hidden bg-neutral-50 font-sans transition-colors dark:bg-neutral-950">
      {/* Background Pattern */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)]"></div>

      {/* Navbar */}
      <nav className="z-50 w-full px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link
            href="/home"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <Image
              src="/weave.png"
              alt="Weave Logo"
              width={28}
              height={28}
              className="h-7 w-7 rounded-sm object-cover"
            />
            <span className="text-base font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              Weave Notes
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/about"
              className="text-xs font-medium text-neutral-600 transition-colors hover:text-neutral-900 sm:text-sm dark:text-neutral-400 dark:hover:text-white"
            >
              Sobre
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-neutral-800 sm:text-sm dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </nav>

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

      <div className="z-10 flex min-h-0 flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8 rounded-xl border border-neutral-200/60 bg-white/60 p-8 shadow-xl backdrop-blur-2xl transition-colors dark:border-neutral-800/60 dark:bg-neutral-900/50">
          <div className="text-center">
            <h1 className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-4xl font-black tracking-tight text-transparent">
              Weave Notes
            </h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Entre ou cadastre-se para orgnanizar suas ideias
            </p>
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
                className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 transition-all placeholder:text-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder:text-gray-600"
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
                  className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 transition-all focus:border-yellow-500 focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-neutral-800 dark:hover:text-white"
                >
                  {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(true)}
                className="text-xs font-medium text-gray-600 transition-colors hover:text-yellow-500 dark:text-gray-400"
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

          <div className="border-t border-neutral-200 pt-4 text-center transition-colors dark:border-white/5">
            <p className="text-sm text-gray-600 dark:text-gray-500">
              Não tem uma conta?{" "}
              <Link href="/auth/signup" className="font-bold text-yellow-500 hover:underline">
                Cadastre-se
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer Minimalista */}
      <footer className="z-10 w-full px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-[10px] text-neutral-400 sm:text-xs">
          <p>© {new Date().getFullYear()} Weave Notes</p>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/eugaelgomes"
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-1 transition-colors hover:text-purple-700 dark:hover:text-purple-300"
            >
              Github
              <FaGithub className="h-4 w-4 text-purple-500" />
            </a>
            <a
              href="https://linkedin.com/in/gael-rene-gomes"
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-1 transition-colors hover:text-neutral-900 dark:hover:text-blue-300"
            >
              Linkedin
              <FaLinkedin className="h-4 w-4 text-blue-500" />
            </a>
          </div>
        </div>
      </footer>

      {showForgotPasswordModal && (
        <ForgotPasswordModal
          isOpen={showForgotPasswordModal}
          onClose={() => setShowForgotPasswordModal(false)}
        />
      )}
    </div>
  );
}
