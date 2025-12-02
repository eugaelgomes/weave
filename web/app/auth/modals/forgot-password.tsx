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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-md border border-neutral-200 bg-neutral-950 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <FaEnvelope className="text-yellow-500" size={20} />
            Recuperar Senha
          </h3>
          <button
            onClick={handleClose}
            disabled={loading}
            className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
            title="Fechar"
            aria-label="Fechar modal"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-4 rounded-md border p-3 text-sm ${
              message.type === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-green-200 bg-green-50 text-green-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Description */}
        <p className="mb-6 text-sm text-gray-600">
          Digite seu email cadastrado e enviaremos as instruções para redefinir sua senha.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="recovery-email"
              className="mb-2 block text-sm font-semibold text-gray-700"
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
              className="block w-full rounded-md border border-neutral-200 bg-neutral-950 px-4 py-3 text-gray-900 shadow-sm transition-all duration-200 placeholder:text-gray-400 hover:border-neutral-200 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-neutral-200 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 rounded-md border border-neutral-200 bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-yellow-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50"
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
