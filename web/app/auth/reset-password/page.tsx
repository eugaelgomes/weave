"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FaEye, FaEyeSlash, FaKey, FaCheckCircle } from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";

interface Message {
  type: "error" | "success" | "";
  text: string;
}

export default function ResetPassword() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { resetSenha } = useAuth();

  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<Message>({ type: "", text: "" });
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    const resetTokenFromUrl = searchParams.get("reset_token");

    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else if (resetTokenFromUrl) {
      setToken(resetTokenFromUrl);
    }
  }, [searchParams]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 6) {
      return "A senha deve ter no mínimo 6 caracteres.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    if (!token) {
      setMsg({ type: "error", text: "Token inválido ou ausente. Use o link enviado por email." });
      return;
    }

    if (!password) {
      setMsg({ type: "error", text: "Por favor, digite sua nova senha." });
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setMsg({ type: "error", text: passwordError });
      return;
    }

    if (password !== confirmPassword) {
      setMsg({ type: "error", text: "As senhas não coincidem." });
      return;
    }

    try {
      setSubmitting(true);
      const result = await resetSenha(token, password);

      if (result.success) {
        setResetSuccess(true);
        setMsg({
          type: "success",
          text: result.message || "Senha redefinida com sucesso!",
        });
        setTimeout(() => {
          router.push("/auth/signin");
        }, 3000);
      } else {
        let errorMessage = result.message || "Falha ao redefinir senha.";

        if (errorMessage.includes("Invalid token")) {
          errorMessage = "Token inválido ou expirado. Solicite uma nova recuperação de senha.";
        }

        setMsg({ type: "error", text: errorMessage });
      }
    } catch {
      setMsg({
        type: "error",
        text: "Não foi possível conectar ao servidor. Verifique sua conexão.",
      });
    } finally {
      setSubmitting(false);
      setTimeout(() => {
        if (!resetSuccess) {
          setMsg({ type: "", text: "" });
        }
      }, 5000);
    }
  };

  return (
    <div className="relative flex h-screen">
      {/* Toast de Mensagens */}
      {msg.text && (
        <div className="fixed top-4 left-1/2 z-50 w-full max-w-md -translate-x-1/2 transform px-4">
          <div
            className={`flex items-center gap-3 rounded-md border p-4 text-sm shadow-xl backdrop-blur-sm ${
              msg.type === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-green-200 bg-green-50 text-green-800"
            }`}
          >
            <div
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                msg.type === "error" ? "bg-red-100" : "bg-green-100"
              }`}
            >
              <svg
                className={`h-5 w-5 ${msg.type === "error" ? "text-red-600" : "text-green-600"}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                {msg.type === "error" ? (
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                ) : (
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.25a.75.75 0 00-1.06 1.5l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                )}
              </svg>
            </div>
            <span className="flex-1 font-medium">{msg.text}</span>
            <button
              onClick={() => setMsg({ type: "", text: "" })}
              className={`transition-colors ${
                msg.type === "error"
                  ? "text-red-400 hover:text-red-600"
                  : "text-green-400 hover:text-green-600"
              }`}
              title="Fechar mensagem"
              aria-label="Fechar mensagem"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Coluna esquerda - formulário */}
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-gray-50 via-yellow-50/30 to-gray-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="text-center">
            <div className="mb-4 inline-flex items-center justify-center">
              <div className="group relative">
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 opacity-20 blur-xl transition-all duration-500 group-hover:opacity-30 group-hover:blur-2xl"></div>

                {/* Logo principal */}
                <h1 className="relative rounded-2xl bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 px-8 py-3 text-3xl font-black tracking-tight text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-yellow-500/50">
                  Weave Notes
                </h1>
              </div>
            </div>

            {!resetSuccess ? (
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-700">
                  <FaKey className="text-yellow-500" />
                  <span>Redefinir Senha</span>
                </div>
                <p className="text-sm text-gray-500">Digite sua nova senha abaixo</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-lg font-semibold text-green-600">
                  <FaCheckCircle />
                  <span>Senha Alterada!</span>
                </div>
                <p className="text-sm text-gray-500">Redirecionando para o login...</p>
              </div>
            )}
          </div>

          {/* Form */}
          {!resetSuccess && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Token (hidden, mas mostra se não veio na URL) */}
              {!token && (
                <div>
                  <label htmlFor="token" className="mb-1 block text-xs font-medium text-gray-700">
                    Token de Recuperação
                  </label>
                  <input
                    id="token"
                    name="token"
                    type="text"
                    placeholder="Cole o token recebido por email"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    disabled={submitting}
                    className="block w-full rounded-md border border-gray-300 bg-neutral-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Nova Senha */}
              <div>
                <label htmlFor="password" className="mb-1 block text-xs font-medium text-gray-700">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    autoComplete="new-password"
                    className="block w-full rounded-md border border-gray-300 bg-neutral-50 px-3 py-2 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                    tabIndex={-1}
                    title={showPassword ? "Esconder senha" : "Mostrar senha"}
                    aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                  >
                    {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirmar Senha */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1 block text-xs font-medium text-gray-700"
                >
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Digite a senha novamente"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={submitting}
                    autoComplete="new-password"
                    className="block w-full rounded-md border border-gray-300 bg-neutral-50 px-3 py-2 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                    tabIndex={-1}
                    title={showConfirmPassword ? "Esconder senha" : "Mostrar senha"}
                    aria-label={showConfirmPassword ? "Esconder senha" : "Mostrar senha"}
                  >
                    {showConfirmPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>

              {/* Botão redefinir */}
              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-yellow-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-yellow-600 focus:ring-2 focus:ring-yellow-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Redefinindo...
                  </span>
                ) : (
                  "Redefinir Senha"
                )}
              </button>
            </form>
          )}

          {/* Link para login */}
          <div className="text-center">
            <p className="text-xs text-gray-600">
              Lembrou sua senha?{" "}
              <Link
                href="/auth/signin"
                className="font-semibold text-yellow-600 transition-colors duration-200 hover:text-yellow-700"
              >
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Coluna direita - imagem */}
      <div className="relative hidden flex-1 lg:block">
        <Image
          src="https://cwn.sfo3.cdn.digitaloceanspaces.com/medias/bg-studying_guy.webp"
          alt="Recuperação de senha"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute right-0 bottom-0 left-0 p-6">
          <div className="max-w-lg">
            <h3 className="mb-2 text-xl font-bold text-white">Redefina sua senha com segurança</h3>
            <p className="text-sm text-white/90">
              Crie uma nova senha forte e volte a acessar suas anotações em instantes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
