"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FaCheckCircle, FaExclamationCircle, FaSpinner } from "react-icons/fa";
import { apiClient, API_ENDPOINTS } from "@/app/services/api-methods";

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

        // Redireciona para o login após 2 segundos
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
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-neutral-900 p-8 shadow-xl">
          {/* Logo */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white">Weave Notes</h1>
            <p className="mt-2 text-sm text-gray-400">Ativação de Conta</p>
          </div>

          {/* Status Message */}
          <div className="mb-6">
            {msg.type === "loading" && (
              <div className="flex items-center justify-center gap-3 rounded-lg bg-blue-500/10 p-4 text-blue-400">
                <FaSpinner className="h-5 w-5 animate-spin" />
                <p className="text-sm">{msg.text}</p>
              </div>
            )}

            {msg.type === "success" && (
              <div className="flex items-center gap-3 rounded-lg bg-green-500/10 p-4 text-green-400">
                <FaCheckCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm">{msg.text}</p>
              </div>
            )}

            {msg.type === "error" && (
              <div className="flex items-center gap-3 rounded-lg bg-red-500/10 p-4 text-red-400">
                <FaExclamationCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm">{msg.text}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          {msg.type === "error" && (
            <div className="space-y-3">
              <Link
                href="/auth/signin"
                className="block w-full rounded-lg bg-yellow-500 px-4 py-3 text-center font-medium text-neutral-950 transition-colors hover:bg-yellow-600"
              >
                Ir para o Login
              </Link>
              <Link
                href="/auth/signup"
                className="block w-full rounded-lg border border-neutral-700 px-4 py-3 text-center font-medium text-white transition-colors hover:bg-neutral-800"
              >
                Criar Nova Conta
              </Link>
            </div>
          )}

          {msg.type === "success" && (
            <div className="text-center text-sm text-gray-400">
              Aguarde enquanto você é redirecionado...
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-500">
          Problemas com a ativação?{" "}
          <a href="mailto:contact@gaelgomes.dev" className="text-yellow-500 hover:underline">
            Entre em contato
          </a>
        </p>
      </div>
    </div>
  );
}
