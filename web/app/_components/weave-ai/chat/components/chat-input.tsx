import React, { Dispatch, SetStateAction } from "react";
import {
  Send,
  Paperclip,
  X,
  Settings2,
  Unlock,
  Lock,
  Globe,
  NotebookPen,
  FolderKanban,
  FileText,
  ChevronDown,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useLanguage } from "@/app/_contexts/language-context";
import { type AIModel } from "@/app/_contexts/chat-context";
import { type Agent } from "@/app/_contexts/agent-context";
import { cn } from "@/lib/utils";

// Assume ModelIcon and AgentIcon are imported or defined here for brevity
// (You might want to extract these to shared components as well)
import { ModelIcon, AgentIcon } from "../../shared/chat-icons";
import { RenderContextIcon } from "../../shared/chat-context-icon";

export interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  canSendAiMessage: boolean;
  loading: boolean;
  isTyping?: boolean;
  messagesLength: number;
  isSandboxOpen: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  handleFilesSelected: (files: FileList | null) => void;
  selectedFiles: File[];
  handleRemoveFile: (file: File) => void;
  contextItems: {
    id: string;
    type: "note" | "project";
    title: string;
    icon?: any;
    color?: string;
  }[];
  handleRemoveContext: (type: "note" | "project", id: string) => void;

  // Options state
  showOptionsMenu: boolean;
  setShowOptionsMenu: Dispatch<SetStateAction<boolean>>;
  allowWebSearch: boolean;
  setAllowWebSearch: Dispatch<SetStateAction<boolean>>;

  // Context Menu state
  contextSearch: string;
  setContextSearch: Dispatch<SetStateAction<string>>;
  filteredNotes: any[];
  filteredProjects: any[];
  noteContextLimit: number;
  setNoteContextLimit: Dispatch<SetStateAction<number>>;
  projectContextLimit: number;
  setProjectContextLimit: Dispatch<SetStateAction<number>>;
  handleAddContext: (
    type: "note" | "project",
    id: string,
    title: string,
    icon?: any,
    color?: string
  ) => void;

  // Model Menu State
  isModelMenuOpen: boolean;
  setIsModelMenuOpen: Dispatch<SetStateAction<boolean>>;
  selectedModel: AIModel | null;
  setSelectedModel: Dispatch<SetStateAction<AIModel | null>>;
  models: AIModel[];
  formatModelLabel: (model: AIModel) => string;

  // Agent Menu State
  isAgentMenuOpen: boolean;
  setIsAgentMenuOpen: Dispatch<SetStateAction<boolean>>;
  selectedAgent: Agent | null;
  selectedAgentId: string | null;
  setSelectedAgentId: Dispatch<SetStateAction<string | null>>;
  agents: Agent[];

  user: any;
  orgId: string;
  router: any;
  fileError: string | null;
  error: string | null;
}

export function ChatInput(props: ChatInputProps) {
  const { t } = useLanguage();
  const [isFocused, setIsFocused] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const isInputActive = props.canSendAiMessage && (isFocused || props.input.trim() !== "");
  const isTextBig = props.input.split("\n").length > 3 || props.input.length > 150;

  React.useEffect(() => {
    if (props.textareaRef.current) {
      props.textareaRef.current.style.height = "auto";
      props.textareaRef.current.style.height = props.textareaRef.current.scrollHeight + "px";
    }
  }, [props.input, isExpanded, props.textareaRef]);

  return (
    <div
      className={cn(
        "pointer-events-none absolute right-0 left-0 z-10 px-4 transition-all duration-700 ease-in-out",
        props.messagesLength === 0 && !props.loading
          ? "top-1/2 -translate-y-1/2 bg-transparent pb-0"
          : `bottom-0 translate-y-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-10 dark:from-[#1d1d1b] dark:via-[#1d1d1b]/95 dark:to-transparent ${
              props.isSandboxOpen ? "pb-2" : "pb-4"
            }`
      )}
    >
      <div
        className={cn(
          "pointer-events-auto mx-auto flex w-full flex-col gap-3 px-2 transition-all duration-500 ease-in-out sm:px-4",
          props.messagesLength === 0 && !props.loading
            ? "max-w-2xl"
            : props.isSandboxOpen
              ? "max-w-xl"
              : "max-w-2xl"
        )}
      >
        {props.messagesLength === 0 && !props.loading && (
          <div className="animate-in fade-in flex flex-col items-center gap-6 pb-4 text-center duration-500">
            <h1 className="font-serif text-3xl font-medium tracking-tight text-gray-800 md:text-4xl dark:text-gray-100">
              {props.user?.user_name?.split(" ")[0] || props.user?.username || "Usuário"}, o que
              posso fazer por você hoje?
            </h1>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {props.selectedFiles.map((file) => (
              <div
                key={`${file.name}-${file.size}`}
                className="border-brand-orange/50 bg-brand-orange/15 text-brand-orange dark:border-brand-orange/40 dark:bg-brand-orange/20 dark:text-brand-yellow flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]"
              >
                <Paperclip className="h-2.5 w-2.5" />
                <span className="font-medium">{file.name}</span>
                <button
                  onClick={() => props.handleRemoveFile(file)}
                  title={t.common.remove}
                  aria-label={t.common.remove}
                  className="hover:text-brand-red dark:hover:text-brand-red"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}

            {props.contextItems.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="border-brand-navy/30 bg-brand-beige text-brand-navy dark:border-brand-beige/20 dark:bg-brand-navy/30 dark:text-brand-beige flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]"
              >
                <RenderContextIcon
                  icon={item.icon}
                  color={item.color}
                  fallback={item.type === "note" ? FileText : FolderKanban}
                />
                <span className="font-medium">{item.title}</span>
                <button
                  onClick={() => props.handleRemoveContext(item.type, item.id)}
                  title={t.common.remove}
                  aria-label={t.common.remove}
                  className="hover:text-brand-red dark:hover:text-brand-red"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`relative flex flex-col gap-1 rounded-[24px] border bg-white p-2.5 transition-all duration-700 focus-within:border-gray-300 dark:border-white/5 dark:bg-[#252525] dark:focus-within:border-white/20 ${
            props.messagesLength === 0 && !props.loading
              ? "border-gray-200/80 shadow-sm"
              : "border-gray-200/80 shadow-lg shadow-black/5 dark:shadow-black/20"
          }`}
        >
          {props.isTyping && (
            <div className="flex items-center px-2 pt-1 pb-2 select-none">
              <style>{`
                @keyframes letter-glow {
                  0%, 100% { opacity: 0.3; }
                  50% { opacity: 1; }
                }
                .animate-thinking-letter { display: inline-block; animation: letter-glow 1.5s ease-in-out infinite; }
              `}</style>
              {(t.weaveAi?.thinking || "Pensando...").split("").map((char: string, idx: number) => (
                <span
                  key={idx}
                  className="animate-thinking-letter text-[11px] font-semibold text-neutral-500 dark:text-neutral-400"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  {char === " " ? "\u00A0" : char}
                </span>
              ))}
            </div>
          )}

          <input
            ref={props.fileInputRef}
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.pdf,.csv,.xls"
            className="hidden"
            onChange={(event) => {
              props.handleFilesSelected(event.target.files);
              event.currentTarget.value = "";
            }}
          />

          <div className={cn("relative", props.isTyping ? "hidden" : "block")}>
            <textarea
              ref={props.textareaRef}
              rows={1}
              value={props.input}
              onChange={(e) => props.setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  props.handleSend();
                }
              }}
              disabled={!props.canSendAiMessage}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={
                props.isTyping
                  ? ""
                  : props.canSendAiMessage
                    ? "joga aqui um bom prompt"
                    : (t.weaveAi.limitReached ?? "Monthly AI message limit reached")
              }
              className={cn(
                "w-full resize-none bg-transparent pr-8 pl-1 text-sm transition-all duration-200 outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-100 dark:placeholder:text-neutral-500",
                isExpanded ? "max-h-[60vh]" : "max-h-32",
                isInputActive ? "min-h-[56px] py-2" : "min-h-[32px] py-1"
              )}
            />
            {(isTextBig || isExpanded) && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Recolher campo" : "Expandir campo"}
                aria-label={isExpanded ? "Recolher campo" : "Expandir campo"}
                className="hover:bg-brand-beige hover:text-brand-navy dark:hover:bg-brand-navy/30 dark:hover:text-brand-beige absolute top-1 right-1 z-10 flex h-7 w-7 items-center justify-center rounded text-neutral-400 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                {isExpanded ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              <button
                onClick={() => props.fileInputRef.current?.click()}
                title={t.weaveAi.attachFiles}
                aria-label={t.weaveAi.attachFiles}
                className="hover:bg-brand-beige hover:text-brand-navy dark:hover:bg-brand-navy/30 dark:hover:text-brand-beige flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              {/* Options Menu */}
              <div className="relative">
                <button
                  onClick={() => props.setShowOptionsMenu(!props.showOptionsMenu)}
                  title="Opções"
                  aria-label="Opções"
                  className="hover:bg-brand-beige hover:text-brand-navy dark:hover:bg-brand-navy/30 dark:hover:text-brand-beige flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
                {props.showOptionsMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => props.setShowOptionsMenu(false)}
                    />
                    <div className="dark:border-surface-dark-border absolute bottom-full left-0 z-20 mb-2 w-60 overflow-hidden rounded border border-neutral-200 bg-white p-1 shadow-lg dark:bg-[#1d1d1b]">
                      <button
                        onClick={() => {
                          props.setAllowWebSearch(!props.allowWebSearch);
                        }}
                        className="hover:bg-brand-beige dark:hover:bg-brand-navy/30 flex w-full items-center justify-between gap-2 rounded px-2 py-2 text-left text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                          <Globe
                            className={`h-3.5 w-3.5 ${props.allowWebSearch ? "text-brand-yellow" : ""}`}
                          />
                          <span>{t.weaveAi.webSearch}</span>
                        </div>
                        {props.allowWebSearch && (
                          <div className="bg-brand-yellow h-1.5 w-1.5 rounded-full"></div>
                        )}
                      </button>

                      <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

                      <div className="dark:border-surface-dark-border border-b border-neutral-100 p-1">
                        <input
                          value={props.contextSearch}
                          onChange={(event) => props.setContextSearch(event.target.value)}
                          placeholder={t.weaveAi.searchContext}
                          className="focus:border-brand-yellow dark:border-surface-dark-border-strong w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs outline-none dark:bg-[#1d1d1b]"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto p-1">
                        <div className="flex items-center gap-1.5 px-1.5 py-1 text-[9px] font-bold tracking-wider text-neutral-400 uppercase">
                          <FileText className="h-3 w-3" />
                          {t.weaveAi.tasks}
                        </div>
                        {props.filteredNotes.slice(0, props.noteContextLimit).map((note: any) => (
                          <button
                            key={note.id}
                            onClick={() =>
                              props.handleAddContext(
                                "note",
                                note.id,
                                note.title,
                                note.icon,
                                note.color
                              )
                            }
                            className="hover:bg-brand-beige dark:hover:bg-brand-navy/30 flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs"
                          >
                            <RenderContextIcon
                              icon={note.icon}
                              color={note.color}
                              fallback={FileText}
                            />
                            <span className="truncate">{note.title}</span>
                          </button>
                        ))}
                        {props.filteredNotes.length > props.noteContextLimit && (
                          <button
                            type="button"
                            onClick={() => props.setNoteContextLimit((prev) => prev + 10)}
                            className="text-brand-navy hover:bg-brand-beige dark:text-brand-yellow dark:hover:bg-brand-navy/30 w-full rounded px-2 py-1 text-left text-[10px] font-semibold"
                          >
                            {t.common.showMore}
                          </button>
                        )}

                        <div className="dark:border-surface-dark-border mt-1 flex items-center gap-1.5 border-t border-neutral-100 px-1.5 py-1 text-[9px] font-bold tracking-wider text-neutral-400 uppercase">
                          <FolderKanban className="h-3 w-3" />
                          {t.weaveAi.projects}
                        </div>
                        {props.filteredProjects
                          .slice(0, props.projectContextLimit)
                          .map((project: any) => (
                            <button
                              key={project.id}
                              onClick={() =>
                                props.handleAddContext(
                                  "project",
                                  project.id,
                                  project.title,
                                  project.icon,
                                  project.color
                                )
                              }
                              className="hover:bg-brand-beige dark:hover:bg-brand-navy/30 flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs"
                            >
                              <RenderContextIcon
                                icon={project.icon}
                                color={project.color}
                                fallback={FolderKanban}
                              />
                              <span className="truncate">{project.title}</span>
                            </button>
                          ))}
                        {props.filteredProjects.length > props.projectContextLimit && (
                          <button
                            type="button"
                            onClick={() => props.setProjectContextLimit((prev) => prev + 10)}
                            className="text-brand-navy hover:bg-brand-beige dark:text-brand-yellow dark:hover:bg-brand-navy/30 w-full rounded px-2 py-1 text-left text-[10px] font-semibold"
                          >
                            {t.common.showMore}
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="relative ml-1">
                <button
                  onClick={() => props.setIsModelMenuOpen((v) => !v)}
                  className="hover:bg-brand-beige hover:text-brand-navy dark:hover:bg-brand-navy/30 dark:hover:text-brand-beige flex h-7 items-center gap-1 rounded-full bg-transparent px-2 py-0.5 text-[10px] font-medium text-neutral-600 transition-all duration-200 hover:scale-105 active:scale-95 dark:text-neutral-400"
                >
                  <ModelIcon
                    model={props.selectedModel}
                    className="h-3.5 w-3.5 flex-shrink-0 object-contain"
                  />
                  <span className="max-w-[120px] truncate text-[10px] font-semibold text-neutral-500">
                    {props.loading
                      ? t.common.loading
                      : props.selectedModel
                        ? props.formatModelLabel(props.selectedModel)
                        : ""}
                  </span>
                  <ChevronDown className="h-2.5 w-2.5 flex-shrink-0 text-neutral-400" />
                </button>

                {props.isModelMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => props.setIsModelMenuOpen(false)}
                    />
                    <div className="dark:border-surface-dark-border absolute bottom-full left-0 z-20 mb-2 w-48 overflow-hidden rounded border border-neutral-200 bg-white shadow-lg dark:bg-[#1d1d1b]">
                      <div className="max-h-48 overflow-y-auto p-0.5">
                        {props.models.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => {
                              props.setSelectedModel(model);
                              props.setIsModelMenuOpen(false);
                            }}
                            className={`hover:bg-brand-beige dark:hover:bg-brand-navy/30 flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs ${
                              props.selectedModel?.id === model.id
                                ? "bg-brand-beige text-brand-navy dark:bg-brand-navy/30 dark:text-brand-beige"
                                : ""
                            }`}
                          >
                            <ModelIcon
                              model={model}
                              className="h-3.5 w-3.5 flex-shrink-0 object-contain"
                            />
                            <span className="truncate">{props.formatModelLabel(model)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="relative ml-1">
                <button
                  onClick={() => props.setIsAgentMenuOpen((prev) => !prev)}
                  className="hover:bg-brand-beige hover:text-brand-navy dark:hover:bg-brand-navy/30 dark:hover:text-brand-beige flex h-7 items-center gap-1 rounded-full bg-transparent px-2 py-0.5 text-[10px] font-medium text-neutral-600 transition-all duration-200 hover:scale-105 active:scale-95 dark:text-neutral-400"
                >
                  <AgentIcon
                    agent={props.selectedAgent}
                    className="h-3.5 w-3.5 flex-shrink-0 rounded-full object-cover"
                  />
                  <span className="max-w-[80px] truncate text-[10px] font-semibold text-neutral-500">
                    {props.loading ? t.common.loading : props.selectedAgent?.name || t.nav.agent}
                  </span>
                  <ChevronDown className="h-2.5 w-2.5 flex-shrink-0 text-neutral-400" />
                </button>

                {props.isAgentMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => props.setIsAgentMenuOpen(false)}
                    />
                    <div className="dark:border-surface-dark-border absolute right-0 bottom-full z-20 mb-2 w-56 overflow-hidden rounded border border-neutral-200 bg-white shadow-lg dark:bg-[#1d1d1b]">
                      <div className="max-h-48 overflow-y-auto p-0.5">
                        <button
                          onClick={() => {
                            props.setSelectedAgentId(null);
                            props.setIsAgentMenuOpen(false);
                          }}
                          className={`hover:bg-brand-beige dark:hover:bg-brand-navy/30 flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-xs ${
                            !props.selectedAgentId
                              ? "bg-brand-beige text-brand-navy dark:bg-brand-navy/30 dark:text-brand-beige"
                              : ""
                          }`}
                        >
                          <AgentIcon agent={null} className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>Agente padrão</span>
                        </button>
                        {props.agents.map((agent) => (
                          <button
                            key={agent.id}
                            onClick={() => {
                              props.setSelectedAgentId(agent.id);
                              props.setIsAgentMenuOpen(false);
                            }}
                            className={`hover:bg-brand-beige dark:hover:bg-brand-navy/30 flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs ${
                              props.selectedAgentId === agent.id
                                ? "bg-brand-beige text-brand-navy dark:bg-brand-navy/30 dark:text-brand-beige"
                                : ""
                            }`}
                          >
                            <AgentIcon
                              agent={agent}
                              className="h-3.5 w-3.5 flex-shrink-0 rounded-full object-cover"
                            />
                            <span className="truncate">{agent.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={props.handleSend}
              disabled={!props.input.trim() || !props.canSendAiMessage}
              title="Enviar mensagem"
              aria-label="Enviar mensagem"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-neutral-300 transition-all duration-200 hover:scale-105 hover:bg-neutral-400 active:scale-95 disabled:pointer-events-none disabled:scale-100 disabled:opacity-30 dark:bg-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-500"
            >
              <Send className="ml-0.5 h-4 w-4" />
            </button>
          </div>
        </div>

        {!props.canSendAiMessage && (
          <p className="text-brand-red mt-2 text-center text-[11px]">
            {t.weaveAi.limitReached ?? "Monthly AI message limit reached."}{" "}
            <button
              onClick={() => props.router.push(`/${props.orgId}/settings/plans`)}
              className="hover:text-brand-orange underline"
            >
              {t.weaveAi.viewPlans ?? "View plans"}
            </button>
          </p>
        )}
        {props.fileError ? (
          <p className="text-brand-red mt-2 text-center text-[11px]">{props.fileError}</p>
        ) : null}
        {props.error ? (
          <p className="text-brand-red mt-2 text-center text-[11px]">{props.error}</p>
        ) : null}
      </div>
    </div>
  );
}
