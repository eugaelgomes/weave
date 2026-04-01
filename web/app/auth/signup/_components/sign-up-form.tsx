"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useAuth } from "../../../_contexts/auth-context";

interface FormData {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface Message {
  type: "error" | "success" | "";
  text: string;
}

export default function SignUpForm() {
  const { createUser, loginWithGoogle, authenticated, loading } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<Message>({ type: "", text: "" });

  useEffect(() => {
    if (!loading && authenticated) {
      router.push("/app");
    }
  }, [authenticated, loading, router]);

  if (loading || authenticated) {
    return (
      <div className="flex w-full flex-1 items-center justify-center border-l border-neutral-100 bg-white lg:w-1/2 lg:flex-none">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    if (!formData.name.trim())
      return setMsg({ type: "error", text: "Por favor, digite seu nome completo." });
    if (!/^[\p{L}\s]+$/u.test(formData.name))
      return setMsg({ type: "error", text: "O nome deve conter apenas letras e espaços." });
    if (formData.name.length > 100)
      return setMsg({ type: "error", text: "O nome não pode ter mais de 100 caracteres." });

    if (!formData.username.trim())
      return setMsg({ type: "error", text: "Por favor, escolha um nome de usuário." });
    if (!/^[a-zA-Z0-9._-]+$/.test(formData.username))
      return setMsg({
        type: "error",
        text: "O usuário pode conter apenas letras, números, ., - ou _",
      });
    if (formData.username.length < 6 || formData.username.length > 18)
      return setMsg({ type: "error", text: "O usuário deve ter entre 6 e 18 caracteres." });

    if (!formData.email.trim())
      return setMsg({ type: "error", text: "Por favor, digite um email válido." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      return setMsg({ type: "error", text: "E-mail inválido." });

    if (!formData.password)
      return setMsg({ type: "error", text: "Por favor, crie uma senha segura." });
    if (formData.password.length < 8)
      return setMsg({ type: "error", text: "A senha deve ter no mínimo 8 caracteres." });
    if (!/[a-z]/.test(formData.password))
      return setMsg({ type: "error", text: "A senha deve conter pelo menos uma letra minúscula." });
    if (!/[A-Z]/.test(formData.password))
      return setMsg({ type: "error", text: "A senha deve conter pelo menos uma letra maiúscula." });
    if (!/[0-9]/.test(formData.password))
      return setMsg({ type: "error", text: "A senha deve conter pelo menos um número." });
    if (formData.password !== formData.confirmPassword)
      return setMsg({ type: "error", text: "As senhas não coincidem." });

    try {
      setSubmitting(true);

      const res = await createUser({
        user_name: formData.name,
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      if (res.success) {
        setMsg({ type: "success", text: "Conta criada com sucesso! Redirecionando..." });
        setTimeout(() => router.push("/auth/signin"), 1500);
      } else {
        let errorMessage = res.message || "Falha ao criar conta.";

        if (errorMessage.includes("already exists") || errorMessage.includes("já existe")) {
          errorMessage = "Este email ou usuário já está em uso. Tente outro.";
        } else if (errorMessage.includes("validation")) {
          errorMessage = "Por favor, verifique os dados inseridos.";
        } else if (errorMessage.includes("Internal Server Error")) {
          errorMessage = "Erro temporário no servidor. Tente novamente em alguns momentos.";
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
      setTimeout(() => setMsg({ type: "", text: "" }), 5000);
    }
  };

  return (
    <>
      <div className="flex w-full flex-1 items-center justify-center border-l border-neutral-100 bg-white px-2.5 py-4 text-[11px] lg:w-1/2 lg:flex-none lg:px-5">
        <div className="mx-auto w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-4 shadow-[0_16px_32px_rgba(15,23,42,0.12)] ring-1 ring-yellow-100/60 sm:p-5">
          <div className="mb-4 flex flex-col text-center">
            <h1 className="text-xl font-black tracking-tight text-neutral-900">Crie sua conta</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-0.5">
                <label className="text-[10px] font-semibold tracking-[0.1em] text-neutral-600">
                  Nome
                </label>
                <input
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-[11px] text-neutral-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-all placeholder:text-neutral-500 focus:border-yellow-500 focus:bg-white focus:ring-2 focus:ring-yellow-500/25 focus:outline-none"
                  placeholder="Seu nome"
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] font-semibold tracking-[0.1em] text-neutral-600">
                  Usuário
                </label>
                <input
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-[11px] text-neutral-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-all placeholder:text-neutral-500 focus:border-yellow-500 focus:bg-white focus:ring-2 focus:ring-yellow-500/25 focus:outline-none"
                  placeholder="seu_usuario"
                />
              </div>
            </div>

            <div className="space-y-0.5">
              <label className="text-[10px] font-semibold tracking-[0.1em] text-neutral-600">
                E-mail
              </label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={submitting}
                autoComplete="email"
                className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-[11px] text-neutral-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-all placeholder:text-neutral-500 focus:border-yellow-500 focus:bg-white focus:ring-2 focus:ring-yellow-500/25 focus:outline-none"
                placeholder="seu@email.com"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-0.5">
                <label className="text-[10px] font-semibold tracking-[0.1em] text-neutral-600">
                  Senha
                </label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    disabled={submitting}
                    autoComplete="new-password"
                    className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-[11px] text-neutral-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-all placeholder:text-neutral-500 focus:border-yellow-500 focus:bg-white focus:ring-2 focus:ring-yellow-500/25 focus:outline-none"
                    placeholder="Mín. 8, A-z, 0-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 transition-colors hover:text-yellow-600"
                  >
                    {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] font-semibold tracking-[0.1em] text-neutral-600">
                  Confirmar
                </label>
                <div className="relative">
                  <input
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={submitting}
                    autoComplete="new-password"
                    className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-[11px] text-neutral-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-all placeholder:text-neutral-500 focus:border-yellow-500 focus:bg-white focus:ring-2 focus:ring-yellow-500/25 focus:outline-none"
                    placeholder="Repita a senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 transition-colors hover:text-yellow-600"
                  >
                    {showConfirmPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-1.5">
              <button
                type="submit"
                disabled={submitting}
                className="w-[140px] rounded-md bg-yellow-500 px-3 py-2 text-[11px] font-extrabold tracking-[0.08em] text-white shadow-[0_8px_18px_rgba(234,179,8,0.35)] transition-all hover:bg-yellow-600 hover:shadow-[0_10px_22px_rgba(234,179,8,0.45)] active:scale-[0.98] disabled:opacity-70"
              >
                {submitting ? "Criando..." : "Criar conta"}
              </button>
            </div>
          </form>

          <div className="relative mt-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-xs tracking-[0.2em] text-neutral-500">ou</span>
            </div>
          </div>

          <div className="mt-4 text-center">
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
              Criar conta com Google
            </button>

            <p className="mt-3 text-[11px] text-neutral-600">
              Já tem conta?{" "}
              <Link
                href="/auth/signin"
                className="font-bold tracking-wide text-yellow-600 transition-colors hover:text-yellow-700 hover:underline"
              >
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>

      {msg.text && (
        <div className="animate-in slide-in-from-bottom-5 fade-in fixed bottom-4 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 duration-300 sm:right-10 sm:bottom-10 sm:left-auto sm:translate-x-0">
          {msg.type === "error" && (
            <div className="flex items-center gap-2.5 rounded-lg border border-red-200 bg-white/95 p-3 text-xs text-red-700 shadow-xl backdrop-blur-xl">
              <span className="font-medium">{msg.text}</span>
            </div>
          )}
          {msg.type === "success" && (
            <div className="flex items-center gap-2.5 rounded-lg border border-green-200 bg-white/95 p-3 text-xs text-green-700 shadow-xl backdrop-blur-xl">
              <span className="font-medium">{msg.text}</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
