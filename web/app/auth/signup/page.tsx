"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaEye, FaEyeSlash, FaRobot, FaUsers, FaBuilding, FaSearch } from "react-icons/fa";
import { HiDocumentText, HiFolder } from "react-icons/hi2";
import { useAuth } from "../../_contexts/auth-context";
import Navbar from "@/app/auth/_components/navbar";
import Footer from "@/app/auth/_components/footer";

const BackgroundSinuous = () => (
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
    <div className="absolute top-[10%] left-[60%] h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-yellow-400 opacity-[0.15] blur-[100px]" />
    <div className="absolute bottom-[5%] left-[20%] h-[350px] w-[350px] rounded-full bg-violet-400 opacity-[0.10] blur-[120px]" />
  </div>
);

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
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
      <div className="relative flex h-[100dvh] w-full flex-col justify-between overflow-hidden font-sans text-neutral-900 selection:bg-yellow-500/30 selection:text-yellow-900">
        <BackgroundSinuous />
        <Navbar ctaLabel="Entrar" ctaHref="/auth/signin" />

        {msg.text && (
          <div className="animate-in slide-in-from-bottom-5 fade-in fixed bottom-4 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 duration-300 sm:right-10 sm:bottom-10 sm:left-auto sm:translate-x-0">
            {msg.type === "error" && (
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
                <span className="font-medium">{msg.text}</span>
              </div>
            )}
            {msg.type === "success" && (
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
                <span className="font-medium">{msg.text}</span>
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
                  Crie sua conta
                </h1>
              </div>

              <form onSubmit={handleSubmit} className="mx-auto w-full max-w-sm space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold tracking-wider text-neutral-500">
                      Nome
                    </label>
                    <input
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={submitting}
                      className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 transition-all placeholder:text-neutral-400 focus:border-yellow-500 focus:bg-white focus:ring-2 focus:ring-yellow-500/20 focus:outline-none"
                      placeholder="Seu nome"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold tracking-wider text-neutral-500">
                      Usuário
                    </label>
                    <input
                      name="username"
                      type="text"
                      value={formData.username}
                      onChange={handleChange}
                      disabled={submitting}
                      className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 transition-all placeholder:text-neutral-400 focus:border-yellow-500 focus:bg-white focus:ring-2 focus:ring-yellow-500/20 focus:outline-none"
                      placeholder="seu_usuario"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-wider text-neutral-500">
                    E-mail
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={submitting}
                    autoComplete="email"
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 transition-all placeholder:text-neutral-400 focus:border-yellow-500 focus:bg-white focus:ring-2 focus:ring-yellow-500/20 focus:outline-none"
                    placeholder="seu@email.com"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold tracking-wider text-neutral-500">
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
                        className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 transition-all placeholder:text-neutral-400 focus:border-yellow-500 focus:bg-white focus:ring-2 focus:ring-yellow-500/20 focus:outline-none"
                        placeholder="Mín. 8, A-z, 0-9"
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

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold tracking-wider text-neutral-500">
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
                        className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 transition-all placeholder:text-neutral-400 focus:border-yellow-500 focus:bg-white focus:ring-2 focus:ring-yellow-500/20 focus:outline-none"
                        placeholder="Repita a senha"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute top-1/2 right-3 -translate-y-1/2 p-2 text-neutral-400 transition-colors hover:text-yellow-600"
                      >
                        {showConfirmPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-[140px] rounded-lg bg-yellow-500 px-4 py-2 text-base font-bold text-white shadow-sm shadow-yellow-500/20 transition-all hover:bg-yellow-600 active:scale-[0.98] disabled:opacity-70"
                  >
                    {submitting ? "Criando..." : "Criar conta"}
                  </button>
                </div>
              </form>

              <div className="mx-auto mt-8 w-full max-w-sm border-t border-neutral-100 pt-5 text-center">
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  className="flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition-all hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.98]"
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

                <p className="mt-5 text-sm text-neutral-500">
                  Já tem conta?{" "}
                  <Link
                    href="/auth/signin"
                    className="font-bold text-yellow-600 transition-colors hover:text-yellow-700 hover:underline"
                  >
                    Entrar
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
