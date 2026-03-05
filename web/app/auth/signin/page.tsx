"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useAuth } from "../../contexts/AuthContext";
import { useSearchParams, useRouter } from "next/navigation";
import { FaEye, FaEyeSlash, FaGithub, FaLinkedin } from "react-icons/fa";
import Link from "next/link";

const ForgotPasswordModal = dynamic(() => import("../modals/forgot-password"), {
  ssr: false,
});

const BackgroundSinuous = () => (
  <div className="absolute inset-0 -z-10 h-full w-full overflow-hidden bg-white">
    <svg
      className="absolute top-0 left-0 h-full w-full text-yellow-500 opacity-35"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1440 800"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
    >
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="1250" cy="150" r="150" strokeDasharray="4 8" />
        <circle cx="1250" cy="150" r="220" />
        <circle cx="1250" cy="150" r="290" />
        <circle cx="1250" cy="150" r="360" />
        <path d="M-100,500 C200,300 400,700 800,400 C1100,175 1300,500 1550,300" />
        <path d="M-100,540 C200,340 400,740 800,440 C1100,215 1300,540 1550,340" />
        <path d="M-100,580 C200,380 400,780 800,480 C1100,255 1300,580 1550,380" />
        <path d="M-100,620 C200,420 400,820 800,520 C1100,295 1300,620 1550,420" />
        <path d="M-50,-50 C150,150 350,-100 650,100" />
        <path d="M-50,0 C150,200 350,-50 650,150" />
        <path d="M-50,50 C150,250 350,0 650,200" />
        <circle cx="50" cy="900" r="300" />
        <circle cx="50" cy="900" r="350" />
        <circle cx="50" cy="900" r="400" />
      </g>
    </svg>
    <div className="absolute top-1/4 left-1/4 -z-10 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400 opacity-20 blur-[120px]" />
    <div className="absolute right-1/4 bottom-1/4 -z-10 h-[300px] w-[300px] rounded-full bg-yellow-500 opacity-15 blur-[100px]" />
  </div>
);

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
  const redirectUrl = redirectParam
    ? redirectParam.replace(/\/+$/, "") || "/app/home"
    : "/app/home";

  useEffect(() => {
    if (!loading && authenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(redirectUrl);
    }
  }, [authenticated, loading, redirectUrl, router]);

  if (loading || authenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
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
      setTimeout(() => {
        setErro("");
        setStatus("");
      }, 5000);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col justify-between overflow-hidden font-sans text-neutral-900 selection:bg-yellow-500/30 selection:text-yellow-900">
      <BackgroundSinuous />

      {/* Navbar */}
      <nav className="z-50 w-full px-4 py-4 sm:px-6 lg:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-md bg-white p-2 shadow shadow-sm">
          <a
            href={process.env.NEXT_PUBLIC_BLOG_URL || "https://blog.weavenotes.app"}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <Image
              src="/weave.png"
              alt="Weave Logo"
              width={28}
              height={28}
              className="h-7 w-7 rounded-sm object-cover lg:h-8 lg:w-8"
            />
            <span className="text-base font-semibold tracking-tight lg:text-lg">Weave Notes</span>
          </a>

          <div className="flex items-center gap-4 lg:gap-6">
            <a
              href={`${process.env.NEXT_PUBLIC_BLOG_URL || "https://blog.weavenotes.app"}/about`}
              className="text-xs font-medium text-neutral-600 transition-colors hover:text-neutral-900 sm:text-sm lg:text-base"
            >
              Sobre
            </a>
            <Link
              href="/auth/signup"
              className="rounded-md bg-yellow-500 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-yellow-600 hover:shadow-lg sm:text-sm lg:px-5 lg:py-2 lg:text-base"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </nav>

      {/* Toast de mensagens */}
      {(erro || status) && (
        <div className="animate-in slide-in-from-bottom-5 fade-in fixed right-6 bottom-6 z-[60] w-full max-w-sm duration-300 sm:right-10 sm:bottom-10">
          {erro && (
            <div className="flex items-center gap-3 rounded-md border border-red-200 bg-white/90 p-4 text-sm text-red-700 shadow-xl backdrop-blur-xl">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-red-100">
                <svg
                  className="h-4 w-4 text-red-500"
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
            <div className="flex items-center gap-3 rounded-md border border-green-200 bg-white/90 p-4 text-sm text-green-700 shadow-xl backdrop-blur-xl">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-green-100">
                <svg
                  className="h-4 w-4 text-green-500"
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

      {/* Formulário de Login */}
      <main className="z-10 flex w-full flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="rounded-md border-2 border-neutral-100 bg-white/55 p-8 shadow shadow-md backdrop-blur-md">
            {/* Header */}
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
                Bem-vindo de volta
              </h1>
              <p className="mt-2 text-sm text-neutral-600">Entre para organizar suas ideias</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-widest text-yellow-500">
                  Usuário ou e-mail
                </label>
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-md border border-neutral-300 bg-white/40 px-4 py-2.5 text-sm text-neutral-900 backdrop-blur-md transition-all placeholder:text-neutral-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                  placeholder="Seu usuário ou e-mail"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-widest text-yellow-500">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    className="w-full rounded-md border border-neutral-300 bg-white/40 px-4 py-2.5 text-sm text-neutral-900 backdrop-blur-md transition-all placeholder:text-neutral-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 transition-colors hover:text-neutral-700"
                  >
                    {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(true)}
                  className="text-xs font-medium text-neutral-500 transition-colors hover:text-yellow-500"
                >
                  Esqueceu a senha?
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-yellow-500 px-7 py-2.5 text-sm font-bold text-white transition-all hover:bg-yellow-600 hover:shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {submitting ? "Entrando..." : "Entrar"}
                </button>
              </div>
            </form>

            <div className="mt-6 border-t border-neutral-200/70 pt-4 text-center">
              <p className="text-sm text-neutral-500">
                Não tem uma conta?{" "}
                <Link
                  href="/auth/signup"
                  className="font-bold text-yellow-500 transition-colors hover:text-yellow-600 hover:underline"
                >
                  Cadastre-se
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="z-10 w-full px-4 py-4 sm:px-6 lg:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-[10px] text-neutral-400 sm:text-xs lg:text-sm">
          <p>© {new Date().getFullYear()} Weave Notes</p>
          <div className="flex items-center gap-4 lg:gap-6">
            <a
              href="https://github.com/eugaelgomes"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition-colors hover:text-purple-700"
            >
              Github
              <FaGithub className="h-4 w-4 text-purple-500" />
            </a>
            <a
              href="https://linkedin.com/in/gael-rene-gomes"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition-colors hover:text-neutral-900"
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
