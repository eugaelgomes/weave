"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FaEye, FaEyeSlash, FaExclamationCircle } from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";

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

export default function SignUp() {
  const { createUser, authenticated, loading } = useAuth();
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50 transition-colors dark:bg-neutral-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-800 border-t-transparent dark:border-white"></div>
      </div>
    );
  }

  if (authenticated) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    // Validação do nome: apenas letras e espaços, 1-100 caracteres
    if (!formData.name.trim())
      return setMsg({ type: "error", text: "Por favor, digite seu nome completo." });
    if (!/^[\p{L}\s]+$/u.test(formData.name))
      return setMsg({ type: "error", text: "O nome deve conter apenas letras e espaços." });
    if (formData.name.length > 100)
      return setMsg({ type: "error", text: "O nome não pode ter mais de 100 caracteres." });

    // Validação do username: letras, números, ., - ou _, 6-18 caracteres
    if (!formData.username.trim())
      return setMsg({ type: "error", text: "Por favor, escolha um nome de usuário." });
    if (!/^[a-zA-Z0-9._-]+$/.test(formData.username))
      return setMsg({
        type: "error",
        text: "O usuário pode conter apenas letras, números, ., - ou _",
      });
    if (formData.username.length < 6 || formData.username.length > 18)
      return setMsg({ type: "error", text: "O usuário deve ter entre 6 e 18 caracteres." });

    // Validação do email
    if (!formData.email.trim())
      return setMsg({ type: "error", text: "Por favor, digite um email válido." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      return setMsg({ type: "error", text: "E-mail inválido." });

    // Validação da senha: mín. 8 caracteres, maiúscula, minúscula e número
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
    <div className="relative flex h-screen w-full overflow-hidden bg-neutral-50 transition-colors font-sans dark:bg-neutral-950">
      {/* Background */}
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
        <div className="absolute inset-0 bg-neutral-50/80 backdrop-blur-[2px] transition-colors dark:bg-neutral-950/60"></div>
      </div>

      {/* Botão Sobre */}
      <div className="absolute top-6 right-6 z-50">
        <Link
          href="/about"
          className="flex items-center gap-2 rounded-md bg-neutral-800/10 px-4 py-2 text-sm font-medium text-neutral-800 backdrop-blur-md transition-all hover:bg-neutral-800/20 dark:bg-neutral-50/10 dark:text-white dark:hover:bg-neutral-50/20"
        >
          <FaExclamationCircle />
        </Link>
      </div>

      {/* Botão Home */}
      <div className="absolute top-6 left-6 z-50">
        <Link
          href="/home/"
          className="flex items-center gap-2 rounded-md bg-neutral-800/10 px-4 py-2 text-sm font-medium text-neutral-800 backdrop-blur-md transition-all hover:bg-neutral-800/20 dark:bg-neutral-50/10 dark:text-white dark:hover:bg-neutral-50/20"
        >
          Home
        </Link>
      </div>

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
      <div className="relative z-10 flex h-full w-full items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 rounded-md border border-neutral-200 bg-neutral-50/90 p-6 shadow-2xl backdrop-blur-2xl transition-colors dark:border-white/10 dark:bg-neutral-900/50">
          <div className="text-center">
            <h1 className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-4xl font-black tracking-tight text-transparent">
              Weave
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-bold tracking-wider text-yellow-500">Nome</label>
                <input
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 transition-all placeholder:text-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder:text-gray-600"
                  placeholder="Seu nome"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold tracking-wider text-yellow-500">Usuário</label>
                <input
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 transition-all placeholder:text-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder:text-gray-600"
                  placeholder="seu_usuario"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold tracking-wider text-yellow-500">E-mail</label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={submitting}
                autoComplete="email"
                className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 transition-all placeholder:text-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder:text-gray-600"
                placeholder="seu@email.com"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-bold tracking-wider text-yellow-500">Senha</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    disabled={submitting}
                    autoComplete="new-password"
                    className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 transition-all focus:border-yellow-500 focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white"
                    placeholder="Mín. 8, A-z, 0-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-neutral-800 dark:hover:text-white"
                  >
                    {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold tracking-wider text-yellow-500">
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
                    className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 transition-all focus:border-yellow-500 focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white"
                    placeholder="Repita a senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-neutral-800 dark:hover:text-white"
                  >
                    {showConfirmPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => router.push("/auth/signin")}
                className="text-xs font-medium text-gray-600 transition-colors hover:text-yellow-500 dark:text-gray-400"
              >
                Já tenho conta
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-yellow-500 px-8 py-2.5 text-sm font-bold text-black shadow-lg shadow-yellow-500/20 transition-all hover:bg-yellow-400 active:scale-95 disabled:opacity-50"
              >
                {submitting ? "Criando..." : "Criar conta"}
              </button>
            </div>
          </form>

          <div className="border-t border-neutral-200 pt-4 text-center transition-colors dark:border-white/5">
            <p className="text-sm text-gray-600 dark:text-gray-500">
              Já tem uma conta?{" "}
              <Link href="/auth/signin" className="font-bold text-yellow-500 hover:underline">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
