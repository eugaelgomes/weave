import React from "react";
import { Sparkles, Globe, Bot } from "lucide-react";
import { type AIModel } from "@/app/_contexts/chat-context";
import { type Agent } from "@/app/_contexts/agent-context";

export const ModelIcon = ({ model, className }: { model?: AIModel | null; className?: string }) => {
  if (model?.logoUrl) {
    return (
      <img
        src={model.logoUrl}
        alt={`${model.provider || model.name || "model"} logo`}
        className={className || "h-3 w-3 rounded-sm object-contain"}
      />
    );
  }

  if (model?.provider === "perplexity") return <Globe className="text-brand-navy h-3 w-3" />;
  return <Sparkles className="text-brand-yellow h-3 w-3" />;
};

export const AgentIcon = ({ agent, className }: { agent?: Agent | null; className?: string }) => {
  if (agent?.avatar_url) {
    return (
      <img
        src={agent.avatar_url}
        alt={`${agent.name || "agent"} avatar`}
        className={className || "h-3 w-3 rounded-full object-cover"}
      />
    );
  }
  return <Bot className={className || "h-3 w-3 text-neutral-500"} />;
};
