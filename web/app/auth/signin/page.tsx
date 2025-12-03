"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "../../contexts/AuthContext";
import { useSearchParams } from "next/navigation";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import ForgotPasswordModal from "../modals/forgot-password";
import Link from "next/link";

export default function SignIn() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const { login, authenticated } = useAuth();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/app/home";

  // Se auth = homepage
  useEffect(() => {
    if (authenticated && typeof window !== "undefined") {
      window.location.href = redirectUrl;
    }
  }, [authenticated, redirectUrl]);

  // Não renderiza o formulário se já autenticado
  if (authenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    const u = username.trim();
    const p = password;
    if (!u || !p) {
      setErro("Por favor, preencha todos os campos para continuar.");
      return;
    }
    try {
      setSubmitting(true);
      const result = await login({
        username: u,
        password: p,
      });
      if (result.success) {
        setStatus(result.message || "Login realizado com sucesso!");
        setTimeout(() => {
          setStatus("");
          window.location.href = redirectUrl;
        }, 200);
      } else {
        let message = result.message || "Falha no login";
        if (message.includes("Usuário ou senha inválidos")) {
          message = "Usuário ou senha incorretos. Verifique seus dados e tente novamente.";
        }
        setErro(message);
      }
    } catch {
      setErro("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
    } finally {
      setSubmitting(false);
      setTimeout(() => setErro(""), 5000);
    }
  };

  return (
    <div className="relative flex h-screen">
      {/* Imagem de fundo para mobile, escondida em telas grandes */}
      <div className="absolute inset-0 lg:hidden">
        <Image
          src="https://cwn.sfo3.cdn.digitaloceanspaces.com/medias/bg-studying_guy.webp"
          alt="Login visual"
          fill
          className="object-cover"
          unoptimized
          priority
        />
        {/* Overlay escuro para melhorar legibilidade do formulário */}
        <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm"></div>
      </div>

      {/* Botão sobre */}
      <div className="absolute top-10 right-10 z-50">
        <Link
          href="/about"
          className="flex items-center gap-2 rounded-md bg-neutral-950/50 px-3 py-2 text-sm font-medium text-gray-500 backdrop-blur-sm transition-colors hover:bg-neutral-800/70"
        >
          Sobre o App
        </Link>
      </div>

      {/* Modal de mensagem de erro/sucesso */}
      {(erro || status) && (
        <div className="animate-in slide-in-from-bottom-5 fade-in fixed right-10 bottom-10 z-50 w-full max-w-md px-4 duration-300">
          {erro && (
            <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-xl backdrop-blur-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-100">
                <svg
                  className="h-5 w-5 text-red-600"
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
              <span className="flex-1 font-medium">{erro}</span>
            </div>
          )}
          {status && (
            <div className="flex items-center gap-3 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800 shadow-xl backdrop-blur-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-100">
                <svg
                  className="h-5 w-5 text-green-600"
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
              <span className="flex-1 font-medium">{status}</span>
            </div>
          )}
        </div>
      )}

      <div className="relative z-10 flex flex-1 items-center justify-center lg:bg-neutral-950 px-4 py-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-xs space-y-6">
          <div className="text-center">
            <div className="flex items-center justify-center">
              {/* Logo principal com gradiente */}
              <h1 className="relative w-full rounded-md bg-gradient-to-br from-yellow-500 via-yellow-500 to-yellow-500 px-8 py-3 text-3xl font-black tracking-tight text-white">
                Weave Notes
              </h1>
            </div>
          </div>

          {/*<button
            type="button"
            onClick={() => loginWithGoogle()}
            className="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={submitting}
          >
            <Image
              src="https://www.svgrepo.com/show/355037/google.svg"
              alt="Google"
              width={16}
              height={16}
              className="mr-2"
              unoptimized
            />
            Entrar com Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">ou</span>
            </div>
          </div>

        */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="mb-1 block text-sm font-semibold text-yellow-500"
              >
                Usuário
              </label>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="Seu usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={submitting}
                autoComplete="username"
                className="block w-full rounded-md border border-neutral-600 bg-neutral-900 px-2 py-2 text-gray-300 text-sm shadow-sm transition-all duration-200 placeholder:text-gray-500 hover:border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-semibold text-yellow-500"
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua sennha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  autoComplete="current-password"
                  className="block w-full rounded-md border border-neutral-600 bg-neutral-900 px-2 py-2 text-gray-300 text-sm shadow-sm transition-all duration-200 placeholder:text-gray-500 hover:border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 transition-colors hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex justify-between text-sm">
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(true)}
                className="font-semibold text-yellow-500 transition-colors hover:text-yellow-600"
              >
                Esqueceu a senha?
              </button>
              <button
                type="submit"
                className="flex justify-center rounded-md border border-transparent bg-yellow-500 px-4 py-2 font-bold text-white shadow-lg transition-all duration-200 hover:bg-yellow-600 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? "Entrando..." : "Entrar"}
              </button>
            </div>
          </form>

          {/* Linha divisória */}
          <div className="h-px bg-neutral-800"></div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Não tem uma conta?{" "}
              <a
                href="/auth/signup"
                className="font-semibold text-yellow-500 transition-colors hover:text-yellow-600"
              >
                Cadastre-se
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Recuperação de Senha */}
      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
      />

      {/* Imagem lateral para desktop - escondida em mobile */}
      <div className="relative hidden flex-1 lg:block">
        <Image
          src="https://cwn.sfo3.cdn.digitaloceanspaces.com/medias/bg-studying_guy.webp"
          alt="Login visual"
          fill
          className="object-cover"
          unoptimized
        />
        {/* Overlay de vidro/claridade saindo da esquerda */}
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/40 to-transparent"></div>
      </div>
    </div>
  );
}
