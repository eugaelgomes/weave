"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "../../_contexts/auth-context";
import { useSearchParams, useRouter } from "next/navigation";
import { FaEye, FaEyeSlash, FaRobot, FaBuilding, FaUsers, FaSearch } from "react-icons/fa";
import { HiDocumentText, HiFolder } from "react-icons/hi2";
import Link from "next/link";
import Navbar from "@/app/auth/_components/navbar";
import Footer from "@/app/auth/_components/footer";

const BackgroundSinuous = () => (
  // Adicionado o fundo 'bg-neutral-50' diretamente aqui, removendo do container pai para revelar o SVG
  <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-neutral-50">
    <svg
      className="absolute inset-0 h-full w-full opacity-40"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1440 800"
      preserveAspectRatio="xMidYMid slice"
    >
      <path
        fill="none"
        stroke="currentColor"
        className="text-yellow-500"
        strokeWidth="0.8"
        d="M-200 100 Q 300 400 800 100 T 1800 200"
      />
      <path
        fill="none"
        stroke="currentColor"
        className="text-violet-300"
        strokeWidth="1.2"
        d="M-100 200 Q 400 500 900 200 T 1900 300"
      />
      <path
        fill="none"
        stroke="currentColor"
        className="text-yellow-400"
        strokeWidth="0.5"
        d="M0 300 Q 500 600 1000 300 T 2000 400"
      />
      <path
        fill="none"
        stroke="currentColor"
        className="text-violet-200"
        strokeWidth="0.75"
        d="M100 400 Q 600 700 1100 400 T 2100 500"
      />
    </svg>
    {/* Esferas de luz: Amarelo (Primário) maior e mais evidente, Violeta (Secundário) como apoio de profundidade */}
    <div className="absolute top-[10%] left-[60%] h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-yellow-400 opacity-[0.15] blur-[100px]" />
    <div className="absolute bottom-[5%] left-[20%] h-[350px] w-[350px] rounded-full bg-violet-400 opacity-[0.10] blur-[120px]" />
  </div>
);

const ForgotPasswordModal = dynamic(() => import("../_modals/forgot-password"), {
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
          message = "Usuário ou e-mail/senha incorretos. Verifique os seus dados.";
        }
        setErro(message);
      }
    } catch {
      setErro("Não foi possível conectar ao servidor. Verifique a sua conexão.");
    } finally {
      setSubmitting(false);
      setTimeout(() => {
        setErro("");
        setStatus("");
      }, 5000);
    }
  };

  return (
    <>
      {/* Removido o fundo sólido daqui para que o BackgroundSinuous apareça */}
      <div className="relative flex h-[100dvh] w-full flex-col justify-between overflow-hidden font-sans text-neutral-900 selection:bg-yellow-500/30 selection:text-yellow-900">
        <BackgroundSinuous />
        <Navbar />

        {(erro || status) && (
          <div className="animate-in slide-in-from-bottom-5 fade-in fixed bottom-4 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 duration-300 sm:right-10 sm:bottom-10 sm:left-auto sm:translate-x-0">
            {erro && (
              <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-white/95 p-4 text-sm text-red-700 shadow-xl backdrop-blur-xl">
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
              <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-white/95 p-4 text-sm text-green-700 shadow-xl backdrop-blur-xl">
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

        <main className="z-10 flex w-full flex-1 items-center justify-center px-4 py-2 sm:px-6">
          <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl shadow-neutral-200/50 lg:flex-row">
            <div className="order-2 hidden w-full flex-col justify-center border-t border-neutral-100 bg-neutral-50/80 p-6 sm:flex lg:order-1 lg:w-3/5 lg:border-t-0 lg:border-r xl:p-8">
              <h2 className="mb-4 bg-gradient-to-r from-yellow-500 to-violet-500 bg-clip-text text-center text-xl font-black text-transparent lg:mb-6 lg:text-2xl">
                Tudo o que precisa
              </h2>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                {[
                  {
                    icon: <FaRobot className="h-4 w-4 text-yellow-600" />,
                    title: "Weave AI",
                    desc: "Chat e edição inteligente",
                  },
                  {
                    icon: <HiDocumentText className="h-4 w-4 text-yellow-600" />,
                    title: "Notas em Blocos",
                    desc: "Hierarquia e exportação",
                  },
                  {
                    icon: <HiFolder className="h-4 w-4 text-yellow-600" />,
                    title: "Projetos",
                    desc: "Tarefas e progresso",
                  },
                  {
                    icon: <FaBuilding className="h-4 w-4 text-yellow-600" />,
                    title: "Organizações",
                    desc: "Equipes e branding",
                  },
                  {
                    icon: <FaUsers className="h-4 w-4 text-yellow-600" />,
                    title: "Colaboração",
                    desc: "Edição conjunta",
                  },
                  {
                    icon: <FaSearch className="h-4 w-4 text-yellow-600" />,
                    title: "Busca Web",
                    desc: "IA traz contexto",
                  },
                ].map((feat) => (
                  <div
                    key={feat.title}
                    className="group flex flex-row items-center gap-3 rounded-xl border border-neutral-100 bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-yellow-300 hover:shadow-sm"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-50 transition-colors group-hover:bg-yellow-100">
                      {feat.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-neutral-800">{feat.title}</p>
                      <p className="mt-0.5 text-xs text-neutral-500">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-center text-xs font-semibold text-neutral-400 lg:mt-8">
                O workspace inteligente para quem pensa grande.
              </p>
            </div>

            <div className="order-1 flex w-full flex-col justify-center bg-white p-6 lg:order-2 lg:w-2/5 xl:p-10">
              <div className="mb-6 flex flex-col text-center">
                <h1 className="text-xl font-black tracking-tight text-neutral-800 lg:text-2xl">
                  Bem-vindo de volta
                </h1>
              </div>

              <form onSubmit={handleSubmit} className="mx-auto w-full max-w-sm space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-wider text-neutral-500">
                    Usuário ou e-mail
                  </label>
                  <input
                    type="text"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    disabled={submitting}
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 transition-all placeholder:text-neutral-400 focus:border-yellow-500 focus:bg-white focus:ring-2 focus:ring-yellow-500/20 focus:outline-none"
                    placeholder="Insira seu usuário ou e-mail"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-wider text-neutral-500">Senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={submitting}
                      className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 transition-all placeholder:text-neutral-400 focus:border-yellow-500 focus:bg-white focus:ring-2 focus:ring-yellow-500/20 focus:outline-none"
                      placeholder="Insira sua senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 p-2 text-neutral-400 transition-colors hover:text-yellow-600"
                    >
                      {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(true)}
                    className="text-sm font-medium text-neutral-500 transition-colors hover:text-yellow-600"
                  >
                    Esqueceu a senha?
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-[100px] rounded-lg bg-yellow-500 px-4 py-2 text-base font-bold text-white shadow-sm shadow-yellow-500/20 transition-all hover:bg-yellow-600 active:scale-[0.98] disabled:opacity-70"
                  >
                    {submitting ? "Entrando..." : "Entrar"}
                  </button>
                </div>
              </form>

              <div className="mx-auto mt-8 w-full max-w-sm border-t border-neutral-100 pt-5 text-center">
                <p className="text-sm text-neutral-500">
                  Não tem conta?{" "}
                  <Link
                    href="/auth/signup"
                    className="font-bold text-yellow-600 transition-colors hover:text-yellow-700 hover:underline"
                  >
                    Crie sua conta
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </main>

        <Footer />

        {showForgotPasswordModal && (
          <ForgotPasswordModal
            isOpen={showForgotPasswordModal}
            onClose={() => setShowForgotPasswordModal(false)}
          />
        )}
      </div>
    </>
  );
}
