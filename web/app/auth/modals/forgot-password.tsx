"use client";

import React, { useState } from "react";
import { FaTimes, FaEnvelope, FaSpinner } from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const { recoverPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!email.trim()) {
      setMessage({ type: "error", text: "Por favor, digite seu email." });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage({ type: "error", text: "Por favor, digite um email válido." });
      return;
    }

    try {
      setLoading(true);
      const result = await recoverPassword(email);

      if (result.success) {
        setMessage({
          type: "success",
          text: result.message || "Instruções de recuperação enviadas para seu email!",
        });
        setTimeout(() => {
          setEmail("");
          setMessage(null);
          onClose();
        }, 3000);
      } else {
        setMessage({
          type: "error",
          text: result.message || "Erro ao enviar instruções. Tente novamente.",
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: "Não foi possível conectar ao servidor. Verifique sua conexão.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setEmail("");
      setMessage(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-5 rounded-md border border-neutral-200/60 bg-white/60 p-6 shadow-xl backdrop-blur-2xl transition-colors dark:border-neutral-800/60 dark:bg-neutral-900/50">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xl font-bold text-neutral-900 dark:text-neutral-50">
            {/*<FaEnvelope className="text-yellow-500" size={20} />*/}
            Recuperar Senha
          </h3>
          <button
            onClick={handleClose}
            disabled={loading}
            className="rounded-md p-2 text-neutral-900 transition-colors hover:bg-neutral-100 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-300 dark:hover:text-neutral-300"
            title="Fechar"
            aria-label="Fechar modal"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`flex items-center gap-3 rounded-md border p-3 text-sm shadow-lg backdrop-blur-xl ${
              message.type === "error"
                ? "border-red-500/50 bg-red-950/80 text-red-200"
                : "border-green-500/50 bg-green-950/80 text-green-200"
            }`}
          >
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Description */}
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Digite seu email cadastrado e enviaremos as instruções para redefinir sua senha.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="recovery-email"
              className="text-xs font-bold tracking-wider text-neutral-700 dark:text-neutral-300"
            >
              Email
            </label>
            <input
              id="recovery-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="seu@email.com"
              autoComplete="email"
              className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 transition-all placeholder:text-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder:text-gray-600"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-neutral-200 pt-4 transition-colors dark:border-white/5">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-black/20 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-yellow-500 px-4 py-2.5 text-sm font-bold text-black shadow-lg shadow-yellow-500/20 transition-all hover:bg-yellow-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin" size={14} />
                  Enviando...
                </>
              ) : (
                "Enviar Instruções"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
