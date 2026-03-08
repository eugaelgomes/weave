"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaEye, FaEyeSlash, FaRobot, FaUsers, FaBuilding, FaSearch } from "react-icons/fa";
import { HiDocumentText, HiFolder } from "react-icons/hi2";
import { useAuth } from "../../contexts/AuthContext";
import Navbar from "@/app/auth/components/Navbar";
import Footer from "@/app/auth/components/Footer";

const BackgroundSinuous = () => (
  <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    <svg
      className="absolute inset-0 h-full w-full text-yellow-500 opacity-20"
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
    <div className="absolute top-1/4 left-1/4 h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400 opacity-20 blur-[80px] lg:h-[400px] lg:w-[400px] lg:blur-[120px]" />
    <div className="absolute right-1/4 bottom-1/4 h-[200px] w-[200px] rounded-full bg-yellow-500 opacity-15 blur-[60px] lg:h-[300px] lg:w-[300px] lg:blur-[100px]" />
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
    <div className="relative flex min-h-screen w-full flex-col justify-between bg-white font-sans text-neutral-900 selection:bg-yellow-500/30 selection:text-yellow-900">
      <BackgroundSinuous />

      <Navbar ctaLabel="Entrar" ctaHref="/auth/signin" />

      {/* Toast de Mensagens */}
      {msg.text && (
        <div className="animate-in slide-in-from-bottom-5 fade-in fixed bottom-4 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 duration-300 sm:right-10 sm:bottom-10 sm:left-auto sm:translate-x-0">
          {msg.type === "error" && (
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-white/95 p-4 text-sm text-red-700 shadow-2xl backdrop-blur-xl">
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
            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-white/95 p-4 text-sm text-green-700 shadow-2xl backdrop-blur-xl">
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

      {/* Container Principal */}
      <main className="z-10 flex w-full flex-1 items-center justify-center px-4 py-2 sm:px-6 lg:px-8">
        {/* Card Único */}
        <div className="flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-xl lg:flex-row">
          {/* Lado Esquerdo (Features) - oculto em mobile */}
          <div className="order-2 hidden w-full flex-col justify-center bg-neutral-50/50 p-6 sm:flex sm:p-10 lg:order-1 lg:w-3/5 xl:p-16">
            <h2 className="mb-6 text-center text-2xl font-black text-yellow-500 lg:mb-10 lg:text-3xl">
              Tudo que você precisa
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 xl:gap-5">
              {[
                {
                  icon: <FaRobot className="h-5 w-5 text-yellow-500" />,
                  title: "Weave AI",
                  desc: "Chat e edição inteligente",
                },
                {
                  icon: <HiDocumentText className="h-5 w-5 text-yellow-500" />,
                  title: "Notas em Blocos",
                  desc: "Hierarquia e exportação",
                },
                {
                  icon: <HiFolder className="h-5 w-5 text-yellow-500" />,
                  title: "Projetos",
                  desc: "Tarefas e progresso",
                },
                {
                  icon: <FaBuilding className="h-5 w-5 text-yellow-500" />,
                  title: "Organizações",
                  desc: "Times e branding",
                },
                {
                  icon: <FaUsers className="h-5 w-5 text-yellow-500" />,
                  title: "Colaboração",
                  desc: "Edição conjunta",
                },
                {
                  icon: <FaSearch className="h-5 w-5 text-yellow-500" />,
                  title: "Busca Web",
                  desc: "IA traz contexto",
                },
              ].map((feat) => (
                <div
                  key={feat.title}
                  className="flex flex-row items-center gap-4 rounded-xl border border-neutral-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-yellow-200 hover:shadow-md"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-50">
                    {feat.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-neutral-700">{feat.title}</p>
                    <p className="mt-0.5 text-xs text-neutral-400">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-sm font-medium text-neutral-400 lg:mt-10">
              O workspace inteligente para quem pensa grande.
            </p>
          </div>

          {/* Lado Direito (Formulário) */}
          <div className="order-1 flex w-full flex-col justify-center p-6 sm:p-10 lg:order-2 lg:w-2/5 xl:p-14">
            <div className="mb-6 flex flex-col text-center">
              <h1 className="text-2xl font-black tracking-tight text-yellow-500 lg:text-3xl">
                Crie sua conta
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="mx-auto w-full max-w-sm space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-wider text-neutral-500">Nome</label>
                  <input
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={submitting}
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-neutral-800 transition-all placeholder:text-neutral-300 focus:border-yellow-500 focus:bg-white focus:ring-2 focus:ring-yellow-500/20 focus:outline-none"
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
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-neutral-800 transition-all placeholder:text-neutral-300 focus:border-yellow-500 focus:bg-white focus:ring-2 focus:ring-yellow-500/20 focus:outline-none"
                    placeholder="seu_usuario"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-wider text-neutral-500">E-mail</label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={submitting}
                  autoComplete="email"
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-neutral-800 transition-all placeholder:text-neutral-300 focus:border-yellow-500 focus:bg-white focus:ring-2 focus:ring-yellow-500/20 focus:outline-none"
                  placeholder="seu@email.com"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-wider text-neutral-500">Senha</label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                      disabled={submitting}
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-neutral-800 transition-all placeholder:text-neutral-300 focus:border-yellow-500 focus:bg-white focus:ring-2 focus:ring-yellow-500/20 focus:outline-none"
                      placeholder="Mín. 8, A-z, 0-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 p-2 text-neutral-400 transition-colors hover:text-yellow-500"
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
                      className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-neutral-800 transition-all placeholder:text-neutral-300 focus:border-yellow-500 focus:bg-white focus:ring-2 focus:ring-yellow-500/20 focus:outline-none"
                      placeholder="Repita a senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 p-2 text-neutral-400 transition-colors hover:text-yellow-500"
                    >
                      {showConfirmPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-yellow-500 px-6 py-3 text-base font-bold text-white transition-all hover:bg-yellow-600 hover:shadow-lg hover:shadow-yellow-500/20 active:scale-[0.98] disabled:opacity-70"
                >
                  {submitting ? "Criando..." : "Criar conta"}
                </button>
              </div>
            </form>

            <div className="mx-auto mt-8 w-full max-w-sm border-t border-neutral-100 pt-6 text-center">
              <p className="text-sm text-neutral-500">
                Já tem conta?{" "}
                <Link
                  href="/auth/signin"
                  className="font-bold text-yellow-500 transition-colors hover:text-yellow-600 hover:underline"
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
  );
}
