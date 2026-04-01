"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "../../../_contexts/auth-context";
import { useSearchParams, useRouter } from "next/navigation";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Link from "next/link";

const ForgotPasswordModal = dynamic(() => import("../../_modals/forgot-password"), {
  ssr: false,
});

export default function SignInForm() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const hasRedirected = useRef(false);

  const { login: loginUser, loginWithGoogle, authenticated, loading } = useAuth();
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
      <div className="flex w-full flex-1 items-center justify-center border-l border-neutral-100 bg-white px-2.5 py-4 text-[11px] lg:w-1/2 lg:flex-none lg:px-5">
        <div className="mx-auto w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-4 shadow-[0_16px_32px_rgba(15,23,42,0.12)] ring-1 ring-yellow-100/60 sm:p-5">
          <div className="mb-4 flex flex-col text-center">
            <h1 className="text-xl font-black tracking-tight text-neutral-900">
              Bem-vindo de volta
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-0.5">
              <label className="text-[10px] font-semibold tracking-[0.1em] text-neutral-600">
                Usuário ou e-mail
              </label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                disabled={submitting}
                className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-[11px] text-neutral-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-all placeholder:text-neutral-500 focus:border-yellow-500 focus:bg-white focus:ring-2 focus:ring-yellow-500/25 focus:outline-none"
                placeholder="Insira seu usuário ou e-mail"
              />
            </div>

            <div className="space-y-0.5">
              <label className="text-[10px] font-semibold tracking-[0.1em] text-neutral-600">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-[11px] text-neutral-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-all placeholder:text-neutral-500 focus:border-yellow-500 focus:bg-white focus:ring-2 focus:ring-yellow-500/25 focus:outline-none"
                  placeholder="Insira sua senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-4 -translate-y-1/2 text-neutral-400 transition-colors hover:text-yellow-600"
                >
                  {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>
            </div>

            <div className="mt-1.5 flex items-center justify-between gap-3 pt-0.5">
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(true)}
                className="text-[10px] font-medium text-neutral-600 transition-colors hover:text-yellow-700"
              >
                Esqueceu a senha?
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-yellow-500 px-3 py-2 text-[11px] font-extrabold tracking-[0.08em] text-white shadow-[0_8px_18px_rgba(234,179,8,0.35)] transition-all hover:bg-yellow-600 hover:shadow-[0_10px_22px_rgba(234,179,8,0.45)] active:scale-[0.98] disabled:opacity-70"
              >
                {submitting ? "Entrando..." : "Entrar"}
              </button>
            </div>
          </form>

          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-xs tracking-[0.2em] text-neutral-500">ou</span>
            </div>
          </div>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={loginWithGoogle}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-[11px] font-semibold tracking-wide text-neutral-800 shadow-sm transition-all hover:border-neutral-400 hover:bg-neutral-50 hover:shadow-md active:scale-[0.98]"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continuar com Google
            </button>

            <p className="mt-3 text-[11px] text-neutral-600">
              Não tem conta?{" "}
              <Link
                href="/auth/signup"
                className="font-bold tracking-wide text-yellow-600 transition-colors hover:text-yellow-700 hover:underline"
              >
                Crie sua conta
              </Link>
            </p>
          </div>
        </div>
      </div>

      {(erro || status) && (
        <div className="animate-in slide-in-from-bottom-5 fade-in fixed bottom-4 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 duration-300 sm:right-10 sm:bottom-10 sm:left-auto sm:translate-x-0">
          {erro && (
            <div className="flex items-center gap-2.5 rounded-lg border border-red-200 bg-white/95 p-3 text-xs text-red-700 shadow-xl backdrop-blur-xl">
              <span className="font-medium">{erro}</span>
            </div>
          )}
          {status && (
            <div className="flex items-center gap-2.5 rounded-lg border border-green-200 bg-white/95 p-3 text-xs text-green-700 shadow-xl backdrop-blur-xl">
              <span className="font-medium">{status}</span>
            </div>
          )}
        </div>
      )}

      {showForgotPasswordModal && (
        <ForgotPasswordModal
          isOpen={showForgotPasswordModal}
          onClose={() => setShowForgotPasswordModal(false)}
        />
      )}
    </>
  );
}
