"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/app/_contexts/language-context";
import { Bot, MessageSquare, Loader2, GitFork, ArrowRight, XCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import {
  getSharedChatPreview,
  forkSharedChat,
} from "@/app/_services/ai-agent-service/agent-service";

export default function SharedChatPreviewPage() {
  const params = useParams();
  const orgId = params?.orgId as string;
  const token = params?.token as string;
  const router = useRouter();
  const { t, locale } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [forking, setForking] = useState(false);

  useEffect(() => {
    async function fetchPreview() {
      try {
        const session = await getSharedChatPreview(token);
        setSessionData(session);
      } catch (e: any) {
        setError(e.message || "Error loading shared session.");
      } finally {
        setLoading(false);
      }
    }
    if (token) fetchPreview();
  }, [token]);

  const handleFork = async () => {
    setForking(true);
    try {
      const newSessionId = await forkSharedChat(token);
      toast.success(
        locale === "en-US" ? "Chat successfully duplicated!" : "Conversa clonada com sucesso!"
      );
      router.push(`/${orgId}/weave-ai/chat/${newSessionId}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to fork session.");
      setForking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <Loader2 className="text-brand-blue h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
          <XCircle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-neutral-900 dark:text-white">
          {locale === "en-US" ? "Link Expired or Invalid" : "Link Expirado ou Inválido"}
        </h2>
        <p className="mb-8 max-w-md text-sm text-neutral-500 dark:text-neutral-400">
          {locale === "en-US"
            ? "This shared chat link is no longer available. It may have been deleted by the owner."
            : "Este link de compartilhamento não está mais disponível. Pode ter sido excluído pelo proprietário."}
        </p>
        <Link
          href={`/${orgId}/weave-ai/chat`}
          className="rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {locale === "en-US" ? "Go back to Weave AI" : "Voltar para o Weave AI"}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-neutral-50/50 p-4 dark:bg-[#1d1d1b]">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-[#252525]">
        <div className="flex flex-col items-center border-b border-neutral-100 bg-neutral-50/50 px-8 py-10 text-center dark:border-neutral-800/80 dark:bg-[#2d2d2d]">
          <div className="bg-brand-yellow/10 mb-5 flex h-16 w-16 items-center justify-center rounded-full">
            <Bot className="text-brand-orange h-8 w-8" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-neutral-900 dark:text-white">
            {locale === "en-US" ? "Shared Conversation" : "Conversa Compartilhada"}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {locale === "en-US"
              ? "Someone from your organization shared an AI context with you."
              : "Alguém da sua organização compartilhou um contexto de IA com você."}
          </p>
        </div>

        <div className="p-8">
          <div className="mb-8 rounded-xl border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-[#1e1e1e]">
            <h3 className="mb-3 text-base font-semibold text-neutral-800 dark:text-neutral-200">
              {sessionData.title}
            </h3>
            <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                {sessionData.message_count} {locale === "en-US" ? "messages" : "mensagens"}
              </span>
              <span>&bull;</span>
              <span>
                {new Date(sessionData.last_message_at).toLocaleDateString(
                  locale === "en-US" ? "en-US" : "pt-BR"
                )}
              </span>
            </div>
          </div>

          <button
            onClick={handleFork}
            disabled={forking}
            className="bg-brand-blue shadow-brand-blue/20 hover:bg-brand-blue/90 dark:bg-brand-yellow dark:shadow-brand-yellow/10 dark:hover:bg-brand-yellow/90 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md transition-all disabled:opacity-70 dark:text-neutral-900"
          >
            {forking ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <GitFork className="h-5 w-5" />
            )}
            {locale === "en-US" ? "Continue this conversation" : "Continuar esta conversa (Fork)"}
            {!forking && <ArrowRight className="h-4 w-4" />}
          </button>

          <p className="mt-4 text-center text-[11px] text-neutral-400 dark:text-neutral-500">
            {locale === "en-US"
              ? "This will create a copy of the chat in your own account."
              : "Isso criará uma cópia do chat na sua conta pessoal."}
          </p>
        </div>
      </div>
    </div>
  );
}
