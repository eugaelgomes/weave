"use client";

import React, { useState } from "react";
import { FaTimes, FaSpinner } from "react-icons/fa";
import { HiOutlineMail } from "react-icons/hi";
import { useAuth } from "../../_contexts/auth-context";

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
      setMessage({ type: "error", text: "Por favor, introduza o seu e-mail." });
      return;
    }

    try {
      setLoading(true);
      const result = await recoverPassword(email);

      if (result.success) {
        setMessage({
          type: "success",
          text: result.message || "Link enviado com sucesso!",
        });
        setTimeout(() => handleClose(), 3000);
      } else {
        setMessage({
          type: "error",
          text: result.message || "E-mail não encontrado.",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Erro na ligação ao servidor." });
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-neutral-900/30 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal - Compacto e Rounded MD */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-md border border-neutral-200 bg-white p-5 shadow-xl transition-all">
        {/* Header Compacto */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HiOutlineMail className="text-yellow-600" size={18} />
            <h3 className="text-lg font-bold text-neutral-900">Recuperar acesso</h3>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-neutral-400 hover:text-neutral-600 disabled:opacity-0"
          >
            <FaTimes size={14} />
          </button>
        </div>

        {/* Feedback Messages */}
        {message && (
          <div
            className={`mb-4 flex items-center rounded-md border px-3 py-2 text-xs font-semibold ${
              message.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <p className="mb-4 text-xs leading-relaxed font-medium text-neutral-500">
          Introduza o e-mail associado à sua conta para receber as instruções de recuperação.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
              Endereço de E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="your.email@weavenotes.app"
              className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-yellow-500 focus:bg-white focus:ring-1 focus:ring-yellow-500/20 focus:outline-none disabled:opacity-50"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 rounded-md py-2 text-xs font-bold text-neutral-500 transition-colors hover:bg-neutral-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex flex-[1.5] items-center justify-center gap-2 rounded-md bg-yellow-500 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-yellow-600 active:scale-[0.98] disabled:opacity-70"
            >
              {loading ? <FaSpinner className="animate-spin" size={12} /> : "Enviar Link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
