"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { useWeaveEngine } from "@/app/_contexts/weave-engine-context";
import { ORG_PERMISSIONS, orgRoleHasPermission } from "@/app/_utils/org-permissions";
import {
  fetchAvailableModels,
  sendChatMessage,
  type AIModel,
} from "@/app/_services/ai-agent-service/agent-service";
import { interpolate } from "@/app/(protected)/home/_components/engine-utils";
import {
  buildComposeBackHref,
  resolveUserDisplayName,
  type ComposeChipId,
  type ComposeIntent,
  type ComposeMessage,
} from "@/app/(protected)/weave-engine/compose/_utils/compose-utils";

const INITIAL_CHIPS: ComposeChipId[] = ["publish_insight", "tune_instructions", "back_feed"];

function chipLabel(
  chip: ComposeChipId,
  copy: ReturnType<typeof useLanguage>["t"]["reasoningComposer"]["conversation"]
): string {
  switch (chip) {
    case "publish_insight":
      return copy.optionPublishInsight;
    case "tune_instructions":
      return copy.optionTuneInstructions;
    case "back_feed":
      return copy.optionBackToFeed;
    default:
      return chip;
  }
}

export function useComposeSession(
  initialProjectId: string | null,
  from: string | null,
  initialIntentParam: string | null = null
) {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const conv = t.reasoningComposer.conversation;
  const { user } = useAuth();
  const { projects } = useWeaveEngine();

  const [projectId, setProjectId] = useState<string | null>(initialProjectId);
  const [intent, setIntent] = useState<ComposeIntent>(null);
  const [messages, setMessages] = useState<ComposeMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const seededRef = useRef(false);
  const deepLinkedRef = useRef(false);

  const displayName = resolveUserDisplayName(user);
  const backHref = buildComposeBackHref(from, projectId);

  const projectTitle = useMemo(
    () => projects.find((p) => p.id === projectId)?.title ?? null,
    [projects, projectId]
  );

  const canManage = useMemo(() => {
    const role =
      typeof user?.org_member_role === "string"
        ? user.org_member_role
        : Array.isArray(user?.org_member_role)
          ? user?.org_member_role?.[0]
          : null;
    return orgRoleHasPermission(role, ORG_PERMISSIONS.MANAGE_PROJECTS);
  }, [user?.org_member_role]);

  useEffect(() => {
    if (!canManage) {
      toast.error(t.home.engine.forbidden);
      router.replace("/weave-engine");
    }
  }, [canManage, router, t.home.engine.forbidden]);

  useEffect(() => {
    void fetchAvailableModels()
      .then((models) => {
        setSelectedModel(
          models.find((m) => m.id === "gpt-4o") ||
            models.find((m) => m.provider === "gemini") ||
            models[0] ||
            null
        );
      })
      .catch(() => setSelectedModel(null));
  }, []);

  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;

    const opener = projectTitle
      ? interpolate(conv.openerWithProject, {
          name: displayName || "…",
          project: projectTitle,
        })
      : interpolate(conv.openerMessage, { name: displayName || "…" });

    setMessages([
      {
        id: "seed-assistant",
        role: "assistant",
        content: opener,
        chips: INITIAL_CHIPS,
      },
    ]);
  }, [conv, displayName, projectTitle]);

  const appendMessage = useCallback((message: ComposeMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  useEffect(() => {
    if (deepLinkedRef.current) return;
    const normalized =
      initialIntentParam === "insight" || initialIntentParam === "instructions"
        ? initialIntentParam
        : null;
    if (!normalized) return;
    deepLinkedRef.current = true;
    setIntent(normalized);
    appendMessage({
      id: `user-deeplink-${Date.now()}`,
      role: "user",
      content: normalized === "insight" ? conv.optionPublishInsight : conv.optionTuneInstructions,
    });
    appendMessage({
      id: `assistant-deeplink-${Date.now()}`,
      role: "assistant",
      content: normalized === "insight" ? conv.userChoseInsight : conv.userChoseInstructions,
    });
  }, [initialIntentParam, conv, appendMessage]);

  const handleChip = useCallback(
    (chip: ComposeChipId) => {
      const label = chipLabel(chip, conv);

      if (chip === "back_feed") {
        router.push(backHref);
        return;
      }

      appendMessage({
        id: `user-chip-${Date.now()}`,
        role: "user",
        content: label,
      });

      if (chip === "publish_insight") {
        setIntent("insight");
        appendMessage({
          id: `assistant-intent-${Date.now()}`,
          role: "assistant",
          content: conv.userChoseInsight,
        });
        return;
      }

      if (chip === "tune_instructions") {
        setIntent("instructions");
        appendMessage({
          id: `assistant-intent-${Date.now()}`,
          role: "assistant",
          content: conv.userChoseInstructions,
        });
      }
    },
    [appendMessage, backHref, conv, router]
  );

  const sendUserMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || chatLoading || !selectedModel) return;

      appendMessage({
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
      });

      const optimisticAssistantMessageId = `assistant-${Date.now()}`;
      const onChunk = (chunk: string) => {
        setMessages((prev) => {
          const existingIndex = prev.findIndex((m) => m.id === optimisticAssistantMessageId);
          if (existingIndex >= 0) {
            const next = [...prev];
            next[existingIndex] = {
              ...next[existingIndex],
              content: next[existingIndex].content + chunk,
            };
            return next;
          }
          return [
            ...prev,
            {
              id: optimisticAssistantMessageId,
              role: "assistant",
              content: chunk,
            },
          ];
        });
      };

      setChatLoading(true);
      try {
        const response = await sendChatMessage({
          message: trimmed,
          model: {
            name: selectedModel.provider || selectedModel.name,
            version: selectedModel.id || selectedModel.version,
          },
          sessionId,
          projectIds: projectId ? [projectId] : undefined,
          allowEdit: false,
          useCase: "engine_compose",
          context: {
            surface: "engine_compose",
            projectId,
            from,
            composeIntent: intent,
            userDisplayName: displayName,
            userLanguage: locale,
          },
        }, onChunk);

        if (response.sessionId) {
          setSessionId(response.sessionId);
        }

        if (response.message?.content) {
          setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== optimisticAssistantMessageId);
            return [
              ...filtered,
              {
                id: response.message.id || optimisticAssistantMessageId,
                role: "assistant",
                content: response.message.content,
                chips: intent ? undefined : INITIAL_CHIPS,
              },
            ];
          });
        }
      } catch (err: unknown) {
        toast.error(conv.chatError, {
          description: err instanceof Error ? err.message : undefined,
        });
      } finally {
        setChatLoading(false);
      }
    },
    [
      appendMessage,
      chatLoading,
      conv.chatError,
      displayName,
      from,
      intent,
      locale,
      projectId,
      selectedModel,
      sessionId,
    ]
  );

  return {
    messages,
    intent,
    projectId,
    setProjectId,
    chatLoading,
    backHref,
    handleChip,
    sendUserMessage,
    canManage,
    projects,
  };
}
