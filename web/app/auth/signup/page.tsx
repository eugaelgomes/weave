"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FaEye, FaEyeSlash, FaCamera } from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";

// Interfaces para tipagem
interface FormData {
  name: string;
  username: string;
  email: string;
  password: string;
}

interface Message {
  type: "error" | "success" | "";
  text: string;
}

export default function SignUp() {
  const { createUser } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    username: "",
    email: "",
    password: "",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<Message>({ type: "", text: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateImage = (file: File): string | null => {
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) return "Formato inválido. Use JPEG, PNG, GIF ou WebP.";
    if (file.size > 5 * 1024 * 1024) return "Imagem deve ter até 2MB.";
    return null;
  };

  const handleImage = (file: File) => {
    const error = validateImage(file);
    if (error) return setMsg({ type: "error", text: error });

    setProfileImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setImagePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleImage(e.target.files[0]);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleImage(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    if (!formData.name.trim())
      return setMsg({ type: "error", text: "Por favor, digite seu nome completo." });
    if (!formData.username.trim())
      return setMsg({ type: "error", text: "Por favor, escolha um nome de usuário." });
    if (!formData.email.trim())
      return setMsg({ type: "error", text: "Por favor, digite um email válido." });
    if (!formData.password)
      return setMsg({ type: "error", text: "Por favor, crie uma senha segura." });

    try {
      setSubmitting(true);

      // Prepara FormData para enviar imagem junto com os dados do usuário
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("username", formData.username);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("password", formData.password);

      // Adiciona a imagem se existir
      if (profileImage) {
        formDataToSend.append("profileImage", profileImage);
      }

      const res = await createUser(formDataToSend);

      if (res.success) {
        setMsg({ type: "success", text: "Conta criada com sucesso! Redirecionando..." });
        setTimeout(() => router.push("/"), 1200);
      } else {
        // Mensagens mais amigáveis baseadas no erro do backend
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
        text: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
      });
    } finally {
      setSubmitting(false);
      setTimeout(() => setMsg({ type: "", text: "" }), 5000);
    }
  };

  return (
    <div className="relative flex h-screen">
      {/* Imagem de fundo para mobile, escondida em telas grandes */}
      <div className="absolute inset-0 lg:hidden">
        <Image
          src="https://cwn.sfo3.cdn.digitaloceanspaces.com/medias/bg-studying_guy.webp"
          alt="Registro visual"
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

      {/* Toast de Mensagens - Flutuante no topo */}
      {msg.text && (
        <div className="fixed top-4 left-1/2 z-50 w-full max-w-md -translate-x-1/2 transform px-4">
          <div
            className={`animate-in slide-in-from-top-4 flex items-center gap-3 rounded-md border p-4 text-sm shadow-xl backdrop-blur-sm duration-300 ${
              msg.type === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-green-200 bg-green-50 text-green-800"
            }`}
          >
            <div
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md ${
                msg.type === "error" ? "bg-red-100" : "bg-green-100"
              }`}
            >
              <svg
                className={`h-5 w-5 ${msg.type === "error" ? "text-red-600" : "text-green-600"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {msg.type === "error" ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                )}
              </svg>
            </div>
            <span className="flex-1 font-medium">{msg.text}</span>
          </div>
        </div>
      )}

      {/* Coluna esquerda - formulário */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-6 sm:px-6 lg:bg-neutral-950 lg:px-8">
        <div className="w-full max-w-xs space-y-6">
          {/* Logo */}
          <div className="text-center">
            <div className="flex items-center justify-center">
              <h1 className="relative w-full rounded-md bg-gradient-to-br from-yellow-500 via-yellow-500 to-yellow-500 px-8 py-3 text-3xl font-black tracking-tight text-white">
                Weave Notes
              </h1>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Seção Superior: Identidade e Foto */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
              {/* Coluna da Esquerda: Nome e Email (Ocupa 8 de 12 colunas) */}
              <div className="flex flex-col justify-between gap-3 sm:col-span-8">
                {/* Nome */}
                <div>
                  <label
                    htmlFor="name"
                    className="mb-1 block text-sm font-semibold text-yellow-500"
                  >
                    Nome
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Seu nome completo"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={submitting}
                    className="block w-full rounded-md border border-neutral-600 bg-neutral-900 px-4 py-2.5 text-gray-400 shadow-sm transition-all placeholder:text-gray-600 hover:border-gray-500 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1 block text-sm font-semibold text-yellow-500"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={submitting}
                    autoComplete="email"
                    className="block w-full rounded-md border border-neutral-600 bg-neutral-900 px-4 py-2.5 text-gray-400 shadow-sm transition-all placeholder:text-gray-600 hover:border-gray-500 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Coluna da Direita: Upload de Foto (Ocupa 4 de 12 colunas) */}
              <div className="flex flex-col sm:col-span-4">
                <label className="mb-1 block text-sm font-semibold text-yellow-500">
                  Foto <span className="text-xs font-normal text-gray-500">(Opcional)</span>
                </label>
                {/* O flex-1 aqui garante que a caixa estique para igualar a altura da coluna da esquerda */}
                <div
                  className={`flex w-full flex-1 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed transition-colors ${
                    dragActive
                      ? "border-yellow-500 bg-neutral-800"
                      : "border-neutral-600 bg-neutral-900 hover:border-gray-500 hover:bg-neutral-800/50"
                  } min-h-[120px]`} // min-h garante altura mínima em mobile
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {imagePreview ? (
                    <Image
                      src={imagePreview}
                      width={100}
                      height={100}
                      className="h-24 w-24 rounded-full border-2 border-neutral-700 object-cover"
                      alt="Preview"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-2 text-center">
                      <FaCamera className="mb-1 text-2xl text-gray-500" />
                      <p className="text-xs text-gray-500">Arraste ou clique</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Seção Inferior: Credenciais */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Usuário */}
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
                  placeholder="seu_usuario"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={submitting}
                  className="block w-full rounded-md border border-neutral-600 bg-neutral-900 px-4 py-2.5 text-gray-400 shadow-sm transition-all placeholder:text-gray-600 hover:border-gray-500 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                />
              </div>

              {/* Senha */}
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
                    placeholder="Min. 6 caracteres"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={submitting}
                    autoComplete="new-password"
                    className="block w-full rounded-md border border-neutral-600 bg-neutral-900 px-4 py-2.5 text-gray-400 shadow-sm transition-all placeholder:text-gray-600 hover:border-gray-500 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 transition-colors hover:text-gray-300"
                  >
                    {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center justify-between pt-2">
              <Link
                href="/auth/signin"
                className="text-sm text-gray-500 transition-colors hover:text-white"
              >
                Já tem conta? <span className="text-yellow-500 hover:underline">Entrar</span>
              </Link>

              <button
                type="submit"
                className="flex items-center justify-center rounded-md bg-yellow-500 px-6 py-2.5 text-sm font-bold text-neutral-900 shadow-md transition-all hover:bg-yellow-400 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? "Processando..." : "Criar Conta"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Imagem lateral para desktop - escondida em mobile */}
      <div className="relative hidden flex-1 lg:block">
        <Image
          src="https://cwn.sfo3.cdn.digitaloceanspaces.com/medias/bg-studying_guy.webp"
          alt="Registro visual"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay de vidro/claridade saindo da esquerda */}
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/40 to-transparent"></div>
      </div>
    </div>
  );
}
