"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaSpinner,
  FaGithub,
  FaLinkedin,
} from "react-icons/fa";
import { apiClient, API_ENDPOINTS } from "@/app/_services/api-methods";

interface Message {
  type: "error" | "success" | "loading" | "";
  text: string;
}

export default function ActivateAccount() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [msg, setMsg] = useState<Message>({ type: "loading", text: "Ativando sua conta..." });
  const [token, setToken] = useState("");

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");

    if (!tokenFromUrl) {
      setMsg({
        type: "error",
        text: "Token de ativação não encontrado. Verifique o link enviado por email.",
      });
      return;
    }

    setToken(tokenFromUrl);
    activateAccount(tokenFromUrl);
  }, [searchParams]);

  const activateAccount = async (activationToken: string) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.ACTIVATE_ACCOUNT, {
        token: activationToken,
      });

      if (response.ok) {
        const data = await response.json();
        setMsg({
          type: "success",
          text: "Conta ativada com sucesso! Redirecionando para o login...",
        });

        setTimeout(() => {
          router.push("/auth/signin");
        }, 2000);
      } else {
        const error = await response.json();
        setMsg({
          type: "error",
          text: error.message || "Erro ao ativar conta. Token inválido ou expirado.",
        });
      }
    } catch (error) {
      console.error("Erro ao ativar conta:", error);
      setMsg({
        type: "error",
        text: "Erro ao ativar conta. Tente novamente mais tarde.",
      });
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
              className="h-7 w-7 rounded-sm object-cover lg:h-8 lg:w-8"
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

      {/* Conteúdo centralizado */}
      <div className="z-10 flex min-h-0 flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 rounded-xl border border-neutral-200/60 bg-white/60 p-8 shadow-xl backdrop-blur-2xl transition-colors dark:border-neutral-800/60 dark:bg-neutral-900/50">
          {/* Logo */}
          <div className="text-center">
            <h1 className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-4xl font-black tracking-tight text-transparent">
              Weave Notes
            </h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Ativação de Conta</p>
          </div>

          {/* Status Message */}
          <div>
            {msg.type === "loading" && (
              <div className="flex items-center justify-center gap-3 rounded-md border border-blue-500/50 bg-blue-950/80 p-4 text-sm text-blue-200 shadow-lg backdrop-blur-xl">
                <FaSpinner className="h-5 w-5 animate-spin" />
                <span className="font-medium">{msg.text}</span>
              </div>
            )}

            {msg.type === "success" && (
              <div className="flex items-center gap-3 rounded-md border border-green-500/50 bg-green-950/80 p-4 text-sm text-green-200 shadow-lg backdrop-blur-xl">
                <FaCheckCircle className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">{msg.text}</span>
              </div>
            )}

            {msg.type === "error" && (
              <div className="flex items-center gap-3 rounded-md border border-red-500/50 bg-red-950/80 p-4 text-sm text-red-200 shadow-lg backdrop-blur-xl">
                <FaExclamationCircle className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">{msg.text}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          {msg.type === "error" && (
            <div className="space-y-3">
              <Link
                href="/auth/signin"
                className="flex w-full justify-center rounded-md bg-yellow-500 px-4 py-2.5 text-sm font-bold text-black shadow-lg shadow-yellow-500/20 transition-all hover:bg-yellow-400 active:scale-95"
              >
                Ir para o Login
              </Link>
              <Link
                href="/auth/signup"
                className="flex w-full justify-center rounded-md border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-white/10 dark:bg-black/20 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Criar Nova Conta
              </Link>
            </div>
          )}

          {msg.type === "success" && (
            <div className="text-center text-sm text-neutral-600 dark:text-neutral-400">
              Aguarde enquanto você é redirecionado...
            </div>
          )}

          {/* Footer link */}
          <div className="border-t border-neutral-200 pt-4 text-center transition-colors dark:border-white/5">
            <p className="text-sm text-neutral-600 dark:text-neutral-500">
              Problemas com a ativação?{" "}
              <a
                href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@gaelgomes.dev"}`}
                className="font-bold text-yellow-500 hover:underline"
              >
                Entre em contato
              </a>
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
