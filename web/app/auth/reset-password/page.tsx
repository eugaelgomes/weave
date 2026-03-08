"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FaEye, FaEyeSlash, FaCheckCircle, FaGithub, FaLinkedin } from "react-icons/fa";
import { useAuth } from "../../_contexts/auth-context";

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
    <div className="relative flex min-h-screen w-full flex-col justify-between bg-neutral-50 text-neutral-900 selection:bg-yellow-500/20 selection:text-yellow-900 dark:bg-neutral-950 dark:text-neutral-50 dark:selection:bg-yellow-500/30 dark:selection:text-yellow-200">
      {/* Background Pattern */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)]"></div>

      {/* Navbar */}
      <nav className="z-50 w-full px-6 py-4 lg:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <a
            href={process.env.NEXT_PUBLIC_BLOG_URL || "https://blog.weavenotes.app"}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <Image
              src="/weave.png"
              alt="Weave Logo"
              width={28}
              height={28}
              className="h-7 w-7 rounded-md object-cover lg:h-8 lg:w-8"
            />
            <span className="text-base font-semibold tracking-tight lg:text-lg">Weave Notes</span>
          </a>

          <div className="flex items-center gap-4 lg:gap-6">
            <a
              href={`${process.env.NEXT_PUBLIC_BLOG_URL || "https://blog.weavenotes.app"}/about`}
              className="text-xs font-medium text-neutral-600 transition-colors hover:text-neutral-900 sm:text-sm lg:text-base dark:text-neutral-400 dark:hover:text-white"
            >
              Sobre
            </a>
            <Link
              href="/auth/signin"
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-neutral-800 sm:text-sm lg:px-5 lg:py-2 lg:text-base dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Entrar
            </Link>
          </div>
        </div>
      </nav>

      {/* Toast de Mensagens */}
      {msg.text && (
        <div className="animate-in slide-in-from-bottom-5 fade-in fixed right-10 bottom-10 z-[60] w-full max-w-md px-4 duration-300">
          {msg.type === "error" && (
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
              <span className="font-medium">{msg.text}</span>
            </div>
          )}
          {msg.type === "success" && (
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
              <span className="font-medium">{msg.text}</span>
            </div>
          )}
        </div>
      )}

      {/* Formulário centralizado */}
      <div className="z-10 flex min-h-0 flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 rounded-md border border-neutral-200/60 bg-white/60 p-8 shadow-xl backdrop-blur-2xl transition-colors dark:border-neutral-800/60 dark:bg-neutral-900/50">
          <div className="text-center">
            <h1 className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-4xl font-black tracking-tight text-transparent">
              Weave Notes
            </h1>

            {!resetSuccess ? (
              <div className="mt-3 space-y-1">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Digite sua nova senha abaixo para redefinir o acesso
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-center gap-2 text-lg font-semibold text-green-500">
                  <FaCheckCircle />
                  <span>Senha Alterada!</span>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Redirecionando para o login...
                </p>
              </div>
            )}
          </div>

          {/* Form */}
          {!resetSuccess && (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Token (hidden, mas mostra se não veio na URL) */}
              {!token && (
                <div className="space-y-1">
                  <label
                    htmlFor="token"
                    className="text-xs font-bold tracking-wider text-yellow-500"
                  >
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
                    className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 transition-all placeholder:text-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder:text-gray-600"
                  />
                </div>
              )}

              {/* Nova Senha */}
              <div className="space-y-1">
                <label
                  htmlFor="password"
                  className="text-xs font-bold tracking-wider text-yellow-500"
                >
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
                    className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 transition-all placeholder:text-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder:text-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-neutral-800 dark:hover:text-white"
                    tabIndex={-1}
                    title={showPassword ? "Esconder senha" : "Mostrar senha"}
                    aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                  >
                    {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirmar Senha */}
              <div className="space-y-1">
                <label
                  htmlFor="confirmPassword"
                  className="text-xs font-bold tracking-wider text-yellow-500"
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
                    className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 transition-all placeholder:text-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder:text-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-neutral-800 dark:hover:text-white"
                    tabIndex={-1}
                    title={showConfirmPassword ? "Esconder senha" : "Mostrar senha"}
                    aria-label={showConfirmPassword ? "Esconder senha" : "Mostrar senha"}
                  >
                    {showConfirmPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>

              {/* Botão redefinir */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="flex w-full justify-center rounded-md bg-yellow-500 px-4 py-2.5 text-sm font-bold text-black shadow-lg shadow-yellow-500/20 transition-all hover:bg-yellow-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 animate-spin text-black"
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
              </div>
            </form>
          )}

          {/* Link para login */}
          <div className="border-t border-neutral-200 pt-4 text-center transition-colors dark:border-white/5">
            <p className="text-sm text-neutral-600 dark:text-neutral-500">
              Lembrou sua senha?{" "}
              <Link href="/auth/signin" className="font-bold text-yellow-500 hover:underline">
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer Minimalista */}
      <footer className="z-10 w-full px-6 py-4 lg:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-[10px] text-neutral-400 sm:text-xs lg:text-sm">
          <p>© {new Date().getFullYear()} Weave Notes</p>

          <div className="flex items-center gap-4 lg:gap-6">
            <a
              href="https://github.com/eugaelgomes"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition-colors hover:text-purple-700 dark:hover:text-purple-300"
            >
              Github
              <FaGithub className="h-4 w-4 text-purple-500" />
            </a>
            <a
              href="https://linkedin.com/in/gael-rene-gomes"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition-colors hover:text-neutral-900 dark:hover:text-blue-300"
            >
              Linkedin
              <FaLinkedin className="h-4 w-4 text-blue-500" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
