"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useLanguage } from "@/app/_contexts/language-context";
import { cn } from "@/lib/utils";
import { engineTextLinkClass } from "@/app/(protected)/[orgId]/weave-engine/_components/engine-styles";
import { ComposeOptionChips } from "@/app/(protected)/[orgId]/weave-engine/compose/_components/compose-option-chips";
import type {
  ComposeChipId,
  ComposeMessage,
} from "@/app/(protected)/[orgId]/weave-engine/compose/_utils/compose-utils";

export type ComposeConversationProps = {
  messages: ComposeMessage[];
  backHref: string;
  chatLoading: boolean;
  onChip: (chip: ComposeChipId) => void;
  onSend: (text: string) => void;
};

export function ComposeConversation({
  messages,
  backHref,
  chatLoading,
  onChip,
  onSend,
}: ComposeConversationProps) {
  const { t } = useLanguage();
  const conv = t.reasoningComposer.conversation;
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const chipLabels: Record<ComposeChipId, string> = {
    publish_insight: conv.optionPublishInsight,
    tune_instructions: conv.optionTuneInstructions,
    back_feed: conv.optionBackToFeed,
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatLoading) return;
    const value = input;
    setInput("");
    void onSend(value);
  };

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col">
      <Link
        href={backHref}
        className={cn(engineTextLinkClass, "mb-3 inline-flex items-center gap-1 self-start")}
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        {conv.back}
      </Link>

      <div className="min-h-[120px] space-y-4 pb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex flex-col", msg.role === "user" ? "items-end" : "items-start")}
          >
            <div
              className={cn(
                "max-w-[92%] rounded-lg px-3 py-2 text-[12px] leading-relaxed font-normal",
                msg.role === "user"
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                  : "bg-neutral-100 text-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-100"
              )}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
            {msg.role === "assistant" && msg.chips?.length ? (
              <ComposeOptionChips
                chips={msg.chips}
                labels={chipLabels}
                onSelect={onChip}
                disabled={chatLoading}
              />
            ) : null}
          </div>
        ))}
        {chatLoading ? (
          <div className="flex items-center gap-2 text-[11px] text-neutral-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {conv.thinking}
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="dark:border-surface-dark-border sticky bottom-0 border-t border-neutral-100 bg-white/90 py-3 backdrop-blur-sm dark:bg-[#1d1d1b]/90"
      >
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={1}
            placeholder={conv.inputPlaceholder}
            className="dark:border-surface-dark-border max-h-28 min-h-[36px] flex-1 resize-none rounded-md border border-neutral-200 bg-white px-3 py-2 text-[12px] font-normal text-neutral-900 outline-none focus-visible:border-neutral-400 dark:bg-[#1d1d1b] dark:text-neutral-100"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || chatLoading}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-white transition-opacity disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
            aria-label={conv.send}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </section>
  );
}
